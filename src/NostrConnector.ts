import {
    SimplePool,
    EventTemplate,
    Filter,
    Event,
    SubCloser,
    UnsignedEvent,
    finalizeEvent,
    getPublicKey,
    VerifiedEvent,
    useWebSocketImplementation,
    verifiedSymbol,
} from "nostr-tools";
import Utils from './Utils';
import Job  from "./Job";

import {  hexToBytes } from '@noble/hashes/utils' ;
import { JobInput, JobParam } from "openagents-grpc-proto";

import Ws from "ws";
import Node from "./Node";
import WebHooks from "./WebHooks";
import Auth from "./Auth";
useWebSocketImplementation(Ws);

type CustomSubscription = {
    filters: Filter[];
    subscriptionId: string;
    subCloser: SubCloser;
    groupId: string;
    events: Event[];
};

type Drive = {
    encryptedUrl:string,    
    url:string,
    discoveryKey:string,
    owner: string,
    version: number
}

export default class NostrConnector {
    relays: Array<string>;
    pool: SimplePool;
    jobs: Array<Job>;
    sk: Uint8Array;
    pk: string;
    customSubscriptions: Map<string, Array<CustomSubscription>>;
    nodes: Array<Node> = [];

    announcementTimeout: number;
    maxEventDuration: number;
    minEventDuration: number = 1000 * 60 * 2;
    maxJobExecutionTime: number;
    minJobExecutionTime: number = 1000 * 60 * 1;
    since: number;
    drives: Map<string, Array<Drive>> = new Map();
    webhooks: WebHooks | undefined;
    auth: Auth;

    constructor(
        secretKey: string,
        relays: Array<string>,
        auth: Auth,
        maxEventDuration: number = 1000 * 60 * 10,
        maxJobExecutionTime: number = 1000 * 60 * 5,
        announcementTimeout: number = 1000 * 60 * 5
    ) {
        this.jobs = [];
        this.customSubscriptions = new Map();

        this.sk = hexToBytes(secretKey);
        this.pk = getPublicKey(this.sk);
        this.relays = relays;
        this.pool = new SimplePool();
        this.announcementTimeout = announcementTimeout;
        this.maxEventDuration = maxEventDuration;
        this.maxJobExecutionTime = maxJobExecutionTime;
        this.since = Date.now() - maxEventDuration;
        this.auth = auth;
        this._loop();
        this.pool.subscribeMany(
            this.relays,
            [
                {
                    // kinds: [5003, 6003, 7000], // TODO: is it better to add the range or keep it undefined?
                    since: Math.floor(this.since / 1000),
                },
                {
                    kinds: [1063],
                    "#m": ["application/hyperdrive+bundle"],
                },
            ],
            {
                onevent: async (event) => {
                   return this._onEvent(event, false);
                },
            }
        );
    }

    async _onEvent(event: Event, local:boolean) {
         try {
            if (local)return;
            if(this.auth){
                if(event.pubkey!=this.pk){
                    if(!this.auth.isEventAuthorized(event)){
                        console.warn("Received event from an unauthorized source. Ignore", event);
                        return;
                    }

                }
            }
             const encrypted = Utils.getTagVars(event, ["encrypted"])[0][0];
             if (encrypted) {
                 const p = Utils.getTagVars(event, ["p"])[0][0];
                 if (p && p == this.pk) {
                    console.log("Received encrypted event", event,"Decrypting...");
                     await Utils.decryptEvent(event, this.sk);
                 }
             }

             this.callWebHooks("Event", event);
             if (event.kind == 1063) {
                 console.log("Discovered hyperdrive+bundle", event);
                 const discoveryKey = Utils.getTagVars(event, ["x"])[0][0];
                 if (!discoveryKey) {
                     console.error("Event missing x tag");
                     return;
                 }
                 let bundleDrives = this.drives.get(discoveryKey);
                 if (!bundleDrives) {
                     bundleDrives = [];
                     this.drives.set(discoveryKey, bundleDrives);
                 }
                 const encryptedUrl = Utils.getTagVars(event, ["url"])[0][0];
                 const nodeId = Utils.getTagVars(event, ["d"])[0][0];
                 const version = Number(Utils.getTagVars(event, ["v"])[0][0] || 0);
                 let append = true;

                 const foundDrive = bundleDrives.find((drive) => drive.encryptedUrl == encryptedUrl);
                 if (!foundDrive) {
                     append = true;
                 } else if (foundDrive.version < version) {
                     foundDrive.version = version;
                     append = false;
                 } else if (foundDrive.owner != nodeId) {
                     append = true;
                 } else {
                     append = false;
                 }
                 if (append) {
                     console.log("Appending drive", encryptedUrl);
                     bundleDrives.push({
                         encryptedUrl: encryptedUrl,
                         discoveryKey: discoveryKey,
                         owner: nodeId,
                         version: version,
                         url: "",
                     });
                 }
             } else if (event.kind >= 5000 && event.kind <= 5999) {
                 console.log("Received event", event);
                 this.getJob("", event.id, true).then((job) => {
                     if (!job) return;
                     job.merge(event, this.relays);
                     this.addExtraRelays(job.relays);
                     this.callWebHooks("Job", job);
                 });
             } else if (event.kind >= 6000 && event.kind <= 7000) {
                 console.log("Received event", event);
                 const e: string = Utils.getTagVars(event, ["e"])[0][0];
                 if (!e) throw new Error("Event missing e tag");
                 this.getJob("", e, true).then((job) => {
                     if (!job) return;
                     job.merge(event, this.relays);
                     this.addExtraRelays(job.relays);
                     this.callWebHooks("Job", job);
                 });
             }
         } catch (e) {
             console.error("Error processing event" + JSON.stringify(event) + "\n" + e);
         }
    }

    setWebHooks(hooks: WebHooks) {
        this.webhooks = hooks;
    }

    callWebHooks(object_type: string, obj: any) {
        if (this.webhooks) {
            this.webhooks.call([object_type, obj]);
        }
    }

    async openCustomSubscription(groupId: string, filters: string[]): Promise<string> {
        const parsedFilters: Filter[] = filters.map((filter) => {
            return JSON.parse(filter) as Filter;
        });

        const subId = Utils.newUUID();
        const process = async (sub: SubCloser, event: Event | undefined) => {
            let customSubs: CustomSubscription[] | undefined = this.customSubscriptions.get(groupId);
            if (!customSubs) {
                customSubs = [];
                this.customSubscriptions.set(groupId, customSubs);
            }
            let customSub: CustomSubscription | undefined = customSubs.find(
                (customSub) => customSub.subscriptionId === subId
            );
            if (!customSub) {
                customSub = {
                    filters: parsedFilters,
                    subscriptionId: subId,
                    subCloser: sub,
                    groupId: groupId,
                    events: [],
                };
                customSubs.push(customSub);
            }
            if (event) {
                customSub.events.push(event);
                this.callWebHooks("Event", event);
            }
        };

        const sub = this.pool.subscribeMany(this.relays, parsedFilters, {
            onevent: (event) => {
                process(sub, event);
            },
            oneose: () => {
                process(sub, undefined);
            },
        });

        return subId;
    }

    async closeCustomSubscription(groupId: string, subscriptionId: string) {
        let customSubs: CustomSubscription[] | undefined = this.customSubscriptions.get(groupId);
        if (!customSubs) {
            return;
        }
        const customSub: CustomSubscription | undefined = customSubs.find(
            (customSub) => customSub.subscriptionId === subscriptionId
        );
        if (!customSub) {
            return;
        }
        customSub.subCloser.close();
        customSubs = customSubs.filter((customSub) => customSub.subscriptionId !== subscriptionId);
        this.customSubscriptions.set(groupId, customSubs);
    }

    async closeAllCustomSubscriptions(groupId: string) {
        let customSubs: CustomSubscription[] | undefined = this.customSubscriptions.get(groupId);
        if (!customSubs) {
            return;
        }
        for (const customSub of customSubs) {
            customSub.subCloser.close();
        }
        customSubs = [];
        this.customSubscriptions.set(groupId, customSubs);
    }

    async getAndConsumeCustomEvents(
        groupId: string,
        subscriptionId: string,
        limit: number
    ): Promise<string[]> {
        let customSubs: CustomSubscription[] | undefined = this.customSubscriptions.get(groupId);
        if (!customSubs) return [];
        const customSub: CustomSubscription | undefined = customSubs.find(
            (customSub) => customSub.subscriptionId === subscriptionId
        );
        if (!customSub) return [];
        const events: Event[] = customSub.events.splice(0, limit);
        return events.map((event) => JSON.stringify(event));
    }

    async addExtraRelays(relays: string[]) {
        for (const relay of relays) {
            try {
                console.log("Ensure connection to", relay);
                await this.pool.ensureRelay(relay);
                if (this.relays.indexOf(relay) === -1) this.relays.push(relay);
            } catch (e) {
                console.error("Error connecting to relay", relay, e);
            }
        }
    }

    async sendSignedEvent(ev: string | Event) {
        return this.sendEvent(ev, false);
    }

    async sendEvent(
        ev: string | Event | UnsignedEvent | EventTemplate,
        sign: boolean = true
    ): Promise<Event> {
        try{
            let event: VerifiedEvent;
            if (typeof ev === "string") {
                event = JSON.parse(ev);
            } else {
                if ((ev as Event)[verifiedSymbol]) {
                    event = ev as VerifiedEvent;
                } else {
                    
                    if (!sign) {
                        throw new Error("Event must be signed");
                    }
                    const unsignedEvent = ev as Event;
                    const encrypted = Utils.getTagVars(unsignedEvent, ["encrypted"])[0][0];
                    if(encrypted){
                        const p = Utils.getTagVars(unsignedEvent, ["p"])[0][0];
                        if(p){
                            await Utils.encryptEvent(unsignedEvent, this.sk);
                        }
                    }
                    event = finalizeEvent(unsignedEvent, this.sk);
                }
            }
            console.log("Publishing event\n", event, "\n To", this.relays);
            this.pool.publish(this.relays, event);
            await this._onEvent(event, true);
            return event;
        }catch(e){
            console.error("Error sending event", e);
            throw e;
        }

    }

    async _loop() {
        try {
            await this.evictExpired();
        } catch (e) {
            console.error("Error looping", e);
        }

        for (const node of this.nodes) {
            try {
                if (!node.isUpdateNeeded()) continue;
                const events = await node.toEvent(this.sk);
                console.log("Announce node\n", JSON.stringify(events, null, 2), "\n");
                for (const event of events) this.sendEvent(event);
                node.clearUpdateNeeded();
            } catch (e) {
                console.error("Error reannuncing nodes", e);
            }
        }

        try {
            this.nodes = this.nodes.filter((node) => !node.isExpired());
        } catch (e) {
            console.error("Error filtering nodes", e);
        }
        setTimeout(() => this._loop(), 1000);
    }

    async evictExpired() {
        let nJobs = this.jobs.length;
        const expiredJobs = this.jobs.filter((job) => job.isExpired());
        for (const job of expiredJobs) {
            try {
                await this.closeAllCustomSubscriptions(job.id);
            } catch (e) {
                console.error("Error closing custom subscriptions", e);
            }
        }
        this.jobs = this.jobs.filter((job) => expiredJobs.indexOf(job) === -1);
        if (nJobs != this.jobs.length) console.log("Evicted", nJobs - this.jobs.length, "jobs");
    }

    async _resolveJobInputs(nodeId: string, job: Job) {
        await job.resolveInputs(async (res: string, type: string) => {
            switch (type) {
                case "event": {
                    const event: Event = (
                        await this.pool.querySync(this.relays, {
                            ids: [res],
                            since: Math.floor(this.since / 1000),
                        })
                    )[0];
                    if (event) {
                        return JSON.stringify(event);
                    }
                    return undefined;
                }
                case "job": {
                    const job = await this.getJob(nodeId, res, false);
                    return job.result.content;
                }
            }
        });
    }

    async findJobs(
        nodeId: string,
        jobIdFilter: RegExp,
        runOnFilter: RegExp,
        descriptionFilter: RegExp,
        customerFilter: RegExp,
        kindFilter: RegExp,
        isAvailable: boolean,
        excludeIds?: string[]
    ): Promise<Array<Job>> {
        const jobs: Array<Job> = [];
        for (const job of this.jobs) {
            if (!job.isAvailable() && isAvailable) {
                continue;
            }
            if (excludeIds&&excludeIds.includes(job.id)) {
                continue;
            }
            if (
                jobIdFilter.test(job.id) &&
                runOnFilter.test(job.runOn) &&
                descriptionFilter.test(job.description) &&
                customerFilter.test(job.customerPublicKey) &&
                kindFilter.test(job.kind.toString())
            ) {
                jobs.push(job);
            }
        }
        for (const job of jobs) {
            await this._resolveJobInputs(nodeId, job);
        }
        return jobs.filter((job) => job.areInputsAvailable());
    }

    async getJob(nodeId: string, id: string, createIfMissing: boolean = false): Promise<Job | undefined> {
        let job: Job | undefined = this.jobs.find((job) => job.id === id);
        if (!job && createIfMissing) {
            job = new Job(this.maxEventDuration, "", "", [], [], this.maxJobExecutionTime);
            job.id = id;
            this.jobs.push(job);
        }
        // console.log(this.jobs.length, "jobs");
        if (job) {
            await this._resolveJobInputs(nodeId, job);
            if (!job.areInputsAvailable()) {
                return undefined;
            }
        }
        return job;
    }

    

    async acceptJob(nodeId: string, id: string) {
        const job = await this.getJob(nodeId, id);
        if (!job) {
            throw new Error("Job not found " + id);
        }
        if (job.isAvailable()) {
            const eventQueue = await job.accept(nodeId, this.pk);
            await Promise.all(eventQueue.map((event) => this.sendEvent(event)));
        } else {
            throw new Error("Job already assigned " + id);
        }
        await this._resolveJobInputs(nodeId, job);
        if (!job.areInputsAvailable()) {
            throw new Error("Inputs not available " + id);
        }

        return job;
    }

    async cancelJob(nodeId: string, id: string, reason: string) {
        const job = await this.getJob(nodeId, id);
        if (!job) {
            throw new Error("Job not found " + id);
        }
        if (job.isAvailable()) {
            throw new Error("Job not assigned");
        }
        const eventQueue: EventTemplate[] = await job.cancel(nodeId, this.pk,  reason);
        await Promise.all(eventQueue.map((event) => this.sendEvent(event)));
        this.closeAllCustomSubscriptions(id);

        return job;
    }

    async outputForJob(nodeId: string, id: string, output: any) {
        const job = await this.getJob(nodeId, id);
        if (!job) {
            throw new Error("Job not found " + id);
        }
        if (job.isAvailable()) {
            throw new Error("Job not assigned " + id);
        }
        const eventQueue: EventTemplate[] = await job.output(nodeId, this.pk, output);
        await Promise.all(eventQueue.map((event) => this.sendEvent(event)));
        return job;
    }

    async completeJob(nodeId: string, id: string, result: string) {
        const job = await this.getJob(nodeId, id);
        if (!job) {
            throw new Error("Job not found " + id);
        }
        if (job.isAvailable()) {
            throw new Error("Job not assigned");
        }
        const eventQueue: EventTemplate[] = await job.complete(nodeId, this.pk, result);
        await Promise.all(eventQueue.map((event) => this.sendEvent(event)));
        this.closeAllCustomSubscriptions(id);
        return job;
    }

    async logForJob(nodeId: string, id: string, log: string) {
        const job = await this.getJob(nodeId, id);
        if (!job) {
            throw new Error("Job not found " + id);
        }
        if (job.isAvailable()) {
            throw new Error("Job not assigned " + id);
        }
        const eventQueue: EventTemplate[] = await job.log(nodeId, this.pk, log);
        await Promise.all(eventQueue.map((event) => this.sendEvent(event)));
        return job;
    }

    async requestJob(
        nodeId: string,
        runOn: string,
        expireAfter: number,
        input: Array<JobInput>,
        param: Array<JobParam>,
        description = "",
        kind?: number,
        outputFormat?: string,
        provider?: string,
        encrypted?: boolean
    ): Promise<Job> {
        let sk: Uint8Array = this.sk;
        if (kind && !((kind >= 5000 && kind <= 5999) || (kind >= 6000 && kind <= 6999)))
            throw new Error("Invalid kind " + kind);
        const job = new Job(
            Utils.clamp(expireAfter, this.minEventDuration, this.maxEventDuration),
            runOn,
            description,
            input,
            param,
            this.maxJobExecutionTime,
            this.relays,
            kind,
            outputFormat,
            nodeId,
            provider,
            encrypted
        );
        console.log("Received job request", job);
        const events: Array<EventTemplate> = await job.toRequest();
        // waitList.push(events.map((event) => this.sendEvent(event)));        
        // const finalizedEvents = await Promise.all(waitList);
        for(const event of events){
            const f=await this.sendEvent(event);
            if(f&&!job.id){
                job.id=f.id;
            }
        }
        
        console.log("Job request sent", job);
        return job;
    }

    async registerNode(
        id: string,
        name: string,
        iconUrl: string,
        description: string
    ): Promise<[Node, number]> {
        let node = this.nodes.find((node) => node.id == id);
        if (!node) {
            node = new Node(id, name, iconUrl, description, this.announcementTimeout);
            this.nodes.push(node);
        }
        const timeout = node.refresh(name, iconUrl, description);
        return [node, timeout];
    }

    getNode(id) {
        return this.nodes.find((node) => node.id == id);
    }

    async query(filter: Filter): Promise<Array<Event>> {
        return this.pool.querySync(this.relays, filter);
    }

    async findAnnouncedHyperdrives(bundleUrl: string): Promise<Array<Drive>> {
        const discoveryKey = await Utils.getHyperdriveDiscoveryKey(bundleUrl);
        const out = [];
        for (const [dd, drives] of this.drives) {
            if (dd == discoveryKey) {
                out.push(...drives);
            }
        }
        for (const drive of out) {
            if (!drive.url) drive.url = await Utils.decryptHyperdrive(bundleUrl, drive.encryptedUrl);
        }
        return out;
        // const filter: Filter = {
        //     kinds: [1063],
        //     "#x": [discoveryKey],
        //     "#m": ["application/hyperdrive+bundle"],
        // };
        // console.log("Filter ", filter);
        // return await Promise.all((await this.query(filter)).map(async (event) => {
        //     const url = Utils.getTagVars(event, ["url"])[0][0];
        //     const nodeId = Utils.getTagVars(event, ["d"])[0][0];
        //     const decryptedUrl = await Utils.decryptHyperdrive(bundleUrl,url);
        //     const version = Utils.getTagVars(event, ["v"])[0][0];
        //     return { url: decryptedUrl, discoveryKey: discoveryKey, owner: nodeId , version: version};
        // }));
    }

    async deleteEvents(ids) {
        const maxIdsPerEvent = 21;
        const waitQueue = [];
        for (let i = 0; i < ids.length; i += maxIdsPerEvent) {
            const idsToDelete = [];
            for (let j = 0; j < maxIdsPerEvent && i + j < ids.length; j++) {
                idsToDelete.push(ids[i]);
            }
            waitQueue.push(
                this.sendEvent(
                    {
                        kind: 5,
                        created_at: Math.floor(Date.now() / 1000),
                        tags: [...idsToDelete.map((id) => ["e", id])],
                        content: "Driver closed",
                    },
                    true
                )
            );
        }

        return Promise.all(waitQueue);
    }

    async unannounceHyperdrive(bundleUrl: string): Promise<void> {
        const discoveryHash = await Utils.getHyperdriveDiscoveryKey(bundleUrl);
        const filter: Filter = {
            kinds: [1063],
            "#x": [discoveryHash],
            "#m": ["application/hyperdrive+bundle"],
        };
        const events = await this.query(filter);
        // await this.sendEvent({
        //     kind: 5,
        //     created_at: Math.floor(Date.now() / 1000),
        //     tags: [
        //         ...events.map((event) => ["e", event.id]),
        //     ],
        //     content: "Driver closed"
        // }, true);
        await this.deleteEvents(events.map((event) => event.id));
    }

    async announceHyperdrive(
        nodeId: string,
        bundleUrl: string,
        driverUrl: string,
        version: string | number
    ): Promise<string> {
        const encryptedData = await Utils.encryptHyperdrive(driverUrl, bundleUrl);
        const filter: Filter = {
            kinds: [1063],
            "#x": [encryptedData.discoveryHash],
            "#m": ["application/hyperdrive+bundle"],
        };
        const oldAnnouncements = await this.query(filter);
        // for(const event of oldAnnouncements){
        //     const oldUrl = Utils.getTagVars(event, ["url"])[0][0];
        //     if(oldUrl == encryptedData.encryptedUrl){
        //         return event.id;
        //     }
        // }
        let deleteOlds;
        try {
            deleteOlds = this.deleteEvents(
                oldAnnouncements
                    .filter((event) => {
                        const oldUrl = Utils.getTagVars(event, ["url"])[0][0];
                        const nodeId = Utils.getTagVars(event, ["d"])[0][0];
                        return oldUrl == encryptedData.encryptedUrl && nodeId == nodeId;
                    })
                    .map((event) => event.id)
            );
        } catch (e) {
            console.error("Error deleting old announcements", e);
            deleteOlds = Promise.resolve();
        }

        const event: EventTemplate = {
            kind: 1063,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ["x", encryptedData.discoveryHash],
                ["m", "application/hyperdrive+bundle"],
                ["url", encryptedData.encryptedUrl],
                ["d", nodeId],
                ["v", "" + version],
            ],
            content: "",
        };
        await deleteOlds; // avoid duplicate-url issue
        const submittedEvent = this.sendEvent(event, true);
        // await deleteOlds;
        return (await submittedEvent).id;
    }
}