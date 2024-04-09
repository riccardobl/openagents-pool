// @generated by protobuf-ts 2.9.4 with parameter long_type_number,server_generic
// @generated from protobuf file "rpc.proto" (syntax proto3)
// tslint:disable
import type { RpcTransport } from "@protobuf-ts/runtime-rpc";
import type { ServiceInfo } from "@protobuf-ts/runtime-rpc";
import { NostrConnector } from "./rpc";
import type { RpcGetEventsResponse } from "./rpc";
import type { RpcGetEventsRequest } from "./rpc";
import type { RpcUnsubscribeFromEventsResponse } from "./rpc";
import type { RpcUnsubscribeFromEventsRequest } from "./rpc";
import type { RpcSubscribeToEventsResponse } from "./rpc";
import type { RpcSubscribeToEventsRequest } from "./rpc";
import type { RpcSendSignedEventResponse } from "./rpc";
import type { RpcSendSignedEventRequest } from "./rpc";
import type { RpcJobLog } from "./rpc";
import type { RpcJobComplete } from "./rpc";
import type { RpcJobOutput } from "./rpc";
import type { RpcCancelJob } from "./rpc";
import type { RpcAcceptJob } from "./rpc";
import type { RpcIsJobDone } from "./rpc";
import type { PendingJobs } from "./rpc";
import type { RpcGetPendingJobs } from "./rpc";
import type { RpcGetJob } from "./rpc";
import { stackIntercept } from "@protobuf-ts/runtime-rpc";
import type { Job } from "./Job";
import type { RpcRequestJob } from "./rpc";
import type { UnaryCall } from "@protobuf-ts/runtime-rpc";
import type { RpcOptions } from "@protobuf-ts/runtime-rpc";
/**
 * @generated from protobuf service NostrConnector
 */
export interface INostrConnectorClient {
    /**
     * job management
     *
     * @generated from protobuf rpc: requestJob(RpcRequestJob) returns (Job);
     */
    requestJob(input: RpcRequestJob, options?: RpcOptions): UnaryCall<RpcRequestJob, Job>;
    /**
     * @generated from protobuf rpc: getJob(RpcGetJob) returns (Job);
     */
    getJob(input: RpcGetJob, options?: RpcOptions): UnaryCall<RpcGetJob, Job>;
    /**
     * @generated from protobuf rpc: getPendingJobs(RpcGetPendingJobs) returns (PendingJobs);
     */
    getPendingJobs(input: RpcGetPendingJobs, options?: RpcOptions): UnaryCall<RpcGetPendingJobs, PendingJobs>;
    /**
     * @generated from protobuf rpc: isJobDone(RpcGetJob) returns (RpcIsJobDone);
     */
    isJobDone(input: RpcGetJob, options?: RpcOptions): UnaryCall<RpcGetJob, RpcIsJobDone>;
    /**
     * @generated from protobuf rpc: acceptJob(RpcAcceptJob) returns (Job);
     */
    acceptJob(input: RpcAcceptJob, options?: RpcOptions): UnaryCall<RpcAcceptJob, Job>;
    /**
     * @generated from protobuf rpc: cancelJob(RpcCancelJob) returns (Job);
     */
    cancelJob(input: RpcCancelJob, options?: RpcOptions): UnaryCall<RpcCancelJob, Job>;
    /**
     * @generated from protobuf rpc: outputForJob(RpcJobOutput) returns (Job);
     */
    outputForJob(input: RpcJobOutput, options?: RpcOptions): UnaryCall<RpcJobOutput, Job>;
    /**
     * @generated from protobuf rpc: completeJob(RpcJobComplete) returns (Job);
     */
    completeJob(input: RpcJobComplete, options?: RpcOptions): UnaryCall<RpcJobComplete, Job>;
    /**
     * @generated from protobuf rpc: logForJob(RpcJobLog) returns (Job);
     */
    logForJob(input: RpcJobLog, options?: RpcOptions): UnaryCall<RpcJobLog, Job>;
    /**
     * generic nostr events
     *
     * @generated from protobuf rpc: sendSignedEvent(RpcSendSignedEventRequest) returns (RpcSendSignedEventResponse);
     */
    sendSignedEvent(input: RpcSendSignedEventRequest, options?: RpcOptions): UnaryCall<RpcSendSignedEventRequest, RpcSendSignedEventResponse>;
    /**
     * @generated from protobuf rpc: subscribeToEvents(RpcSubscribeToEventsRequest) returns (RpcSubscribeToEventsResponse);
     */
    subscribeToEvents(input: RpcSubscribeToEventsRequest, options?: RpcOptions): UnaryCall<RpcSubscribeToEventsRequest, RpcSubscribeToEventsResponse>;
    /**
     * @generated from protobuf rpc: unsubscribeFromEvents(RpcUnsubscribeFromEventsRequest) returns (RpcUnsubscribeFromEventsResponse);
     */
    unsubscribeFromEvents(input: RpcUnsubscribeFromEventsRequest, options?: RpcOptions): UnaryCall<RpcUnsubscribeFromEventsRequest, RpcUnsubscribeFromEventsResponse>;
    /**
     * @generated from protobuf rpc: getEvents(RpcGetEventsRequest) returns (RpcGetEventsResponse);
     */
    getEvents(input: RpcGetEventsRequest, options?: RpcOptions): UnaryCall<RpcGetEventsRequest, RpcGetEventsResponse>;
}
/**
 * @generated from protobuf service NostrConnector
 */
export class NostrConnectorClient implements INostrConnectorClient, ServiceInfo {
    typeName = NostrConnector.typeName;
    methods = NostrConnector.methods;
    options = NostrConnector.options;
    constructor(private readonly _transport: RpcTransport) {
    }
    /**
     * job management
     *
     * @generated from protobuf rpc: requestJob(RpcRequestJob) returns (Job);
     */
    requestJob(input: RpcRequestJob, options?: RpcOptions): UnaryCall<RpcRequestJob, Job> {
        const method = this.methods[0], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcRequestJob, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: getJob(RpcGetJob) returns (Job);
     */
    getJob(input: RpcGetJob, options?: RpcOptions): UnaryCall<RpcGetJob, Job> {
        const method = this.methods[1], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcGetJob, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: getPendingJobs(RpcGetPendingJobs) returns (PendingJobs);
     */
    getPendingJobs(input: RpcGetPendingJobs, options?: RpcOptions): UnaryCall<RpcGetPendingJobs, PendingJobs> {
        const method = this.methods[2], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcGetPendingJobs, PendingJobs>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: isJobDone(RpcGetJob) returns (RpcIsJobDone);
     */
    isJobDone(input: RpcGetJob, options?: RpcOptions): UnaryCall<RpcGetJob, RpcIsJobDone> {
        const method = this.methods[3], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcGetJob, RpcIsJobDone>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: acceptJob(RpcAcceptJob) returns (Job);
     */
    acceptJob(input: RpcAcceptJob, options?: RpcOptions): UnaryCall<RpcAcceptJob, Job> {
        const method = this.methods[4], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcAcceptJob, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: cancelJob(RpcCancelJob) returns (Job);
     */
    cancelJob(input: RpcCancelJob, options?: RpcOptions): UnaryCall<RpcCancelJob, Job> {
        const method = this.methods[5], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcCancelJob, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: outputForJob(RpcJobOutput) returns (Job);
     */
    outputForJob(input: RpcJobOutput, options?: RpcOptions): UnaryCall<RpcJobOutput, Job> {
        const method = this.methods[6], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcJobOutput, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: completeJob(RpcJobComplete) returns (Job);
     */
    completeJob(input: RpcJobComplete, options?: RpcOptions): UnaryCall<RpcJobComplete, Job> {
        const method = this.methods[7], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcJobComplete, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: logForJob(RpcJobLog) returns (Job);
     */
    logForJob(input: RpcJobLog, options?: RpcOptions): UnaryCall<RpcJobLog, Job> {
        const method = this.methods[8], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcJobLog, Job>("unary", this._transport, method, opt, input);
    }
    /**
     * generic nostr events
     *
     * @generated from protobuf rpc: sendSignedEvent(RpcSendSignedEventRequest) returns (RpcSendSignedEventResponse);
     */
    sendSignedEvent(input: RpcSendSignedEventRequest, options?: RpcOptions): UnaryCall<RpcSendSignedEventRequest, RpcSendSignedEventResponse> {
        const method = this.methods[9], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcSendSignedEventRequest, RpcSendSignedEventResponse>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: subscribeToEvents(RpcSubscribeToEventsRequest) returns (RpcSubscribeToEventsResponse);
     */
    subscribeToEvents(input: RpcSubscribeToEventsRequest, options?: RpcOptions): UnaryCall<RpcSubscribeToEventsRequest, RpcSubscribeToEventsResponse> {
        const method = this.methods[10], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcSubscribeToEventsRequest, RpcSubscribeToEventsResponse>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: unsubscribeFromEvents(RpcUnsubscribeFromEventsRequest) returns (RpcUnsubscribeFromEventsResponse);
     */
    unsubscribeFromEvents(input: RpcUnsubscribeFromEventsRequest, options?: RpcOptions): UnaryCall<RpcUnsubscribeFromEventsRequest, RpcUnsubscribeFromEventsResponse> {
        const method = this.methods[11], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcUnsubscribeFromEventsRequest, RpcUnsubscribeFromEventsResponse>("unary", this._transport, method, opt, input);
    }
    /**
     * @generated from protobuf rpc: getEvents(RpcGetEventsRequest) returns (RpcGetEventsResponse);
     */
    getEvents(input: RpcGetEventsRequest, options?: RpcOptions): UnaryCall<RpcGetEventsRequest, RpcGetEventsResponse> {
        const method = this.methods[12], opt = this._transport.mergeOptions(options);
        return stackIntercept<RpcGetEventsRequest, RpcGetEventsResponse>("unary", this._transport, method, opt, input);
    }
}
