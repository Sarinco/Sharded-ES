export class CQRSEvent {
    path: string;
    auth: string;

    constructor(path: string, auth: string) {
        this.path = path;
        this.auth = auth;
    }

}
