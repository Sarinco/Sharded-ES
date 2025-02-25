import { ControlPlaneServer } from './server';
import net from 'net';

export class CallbackFunctions {
    public onConnection: (socket: net.Socket, clientId: string) => void;
    public onData: (data: Buffer, clientId: string) => void;
    public onClose: (clientId: string) => void;
    public onTimeout: (clientId: string) => void;
    public onError: (error: Error, clientId: string) => void;

    constructor() {
        this.onConnection = (socket: net.Socket) => {};
        this.onData = (data: Buffer, clientId: string) => {};
        this.onClose = (clientId: string) => {};
        this.onTimeout = (clientId: string) => {};
        this.onError = (error: Error, clientId: string) => {};
    };

    // Set the onConnection callback
    setOnConnection(callback: (socket: net.Socket, clientId: string) => void) {
        this.onConnection = callback;
    }

    // Set the onData callback
    setOnData(callback: (data: Buffer, clientId: string) => void) {
        this.onData = callback;
    }

    // Set the onClose callback
    setOnClose(callback: (clientId: string) => void) {
        this.onClose = callback;
    }

    // Set the onTimeout callback
    setOnTimeout(callback: (clientId: string) => void) {
        this.onTimeout = callback;
    }

    // Set the onError callback
    setOnError(callback: (error: Error, clientId: string) => void) {
        this.onError = callback;
    }
}
