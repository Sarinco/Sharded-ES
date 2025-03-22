export class CQRSEvent {
    path: string;
    auth: string;

    constructor(path: string, header: string) {
        this.path = path;
        this.auth = header;
    }

}
