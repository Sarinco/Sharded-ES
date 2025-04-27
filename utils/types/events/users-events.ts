import { CQRSEvent } from "./CQRS-events";

// Adding a new user event
export class UserAddedEvent {
    email: string;
    hash: string;
    salt: string;
    role: string;

    constructor(email: string, hash: string, salt: string, role: string) {
        this.email = email;
        this.hash = hash;
        this.salt = salt;
        this.role = role;
    }

    static fromJSON(json: any): UserAddedEvent {
        return new UserAddedEvent(json.email, json.hash, json.salt, json.role);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.email,
            value: JSON.stringify({
                type: "UserAdded",
                data: {
                    email: this.email,
                    hash: this.hash,
                    salt: this.salt,
                    role: this.role
                }
            })
        }
    }
}

export class UserFailedAuthenticationEvent {
    email: string;

    constructor(email: string) {
        this.email = email;
    }

    static fromJSON(json: any): UserFailedAuthenticationEvent {
        return new UserFailedAuthenticationEvent(json.email);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.email,
            value: JSON.stringify({
                type: "UserFailedAuthentication",
                data: {
                    email: this.email
                }
            })
        }
    }
}

export class UserAuthenticatedEvent {
    email: string;

    constructor(email: string) {
        this.email = email;
    }

    static fromJSON(json: any): UserAuthenticatedEvent {
        return new UserAuthenticatedEvent(json.email);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.email,
            value: JSON.stringify({
                type: "UserAuthenticated",
                data: {
                    email: this.email
                }
            })
        }
    }
}

export class UserDeletedEvent {
    email: string;
    modifiedBy: string;

    constructor(email: string, modifiedBy: string) {
        this.email = email;
        this.modifiedBy = modifiedBy;
    }

    static fromJSON(json: any): UserDeletedEvent {
        return new UserDeletedEvent(json.email, json.modifiedBy);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.email,
            value: JSON.stringify({
                type: "UserDeleted",
                data: {
                    email: this.email,
                    modifiedBy: this.modifiedBy
                }
            })
        }
    }
}

export class UserUpdatedEvent {
    email: string;
    hash: string;
    salt: string;
    role: string;
    modifiedBy: string;

    constructor(email: string, hash: string, salt: string, role: string, modifiedBy: string) {
        this.email = email;
        this.hash = hash;
        this.salt = salt;
        this.role = role;
        this.modifiedBy = modifiedBy;
    }

    static fromJSON(json: any): UserUpdatedEvent {
        return new UserUpdatedEvent(json.email, json.hash, json.salt, json.role, json.modifiedBy);
    }

    toJSON(): any {
        // Return a JSON representation for KafkaJS
        return {
            key: this.email,
            value: JSON.stringify({
                type: "UserUpdated",
                data: {
                    email: this.email,
                    hash: this.hash,
                    salt: this.salt,
                    role: this.role,
                    modifiedBy: this.modifiedBy
                }
            })
        }
    }
}

export class GetUserEvent extends CQRSEvent {
    email: string;

    constructor(email: string, path: string, auth: string) {
        super(path, auth);
        this.email = email;
    }

    fromJSON(json: { email: string; path: string; auth: string; }) {
        return new GetUserEvent(json.email, json.path, json.auth);
    }

    toJSON() {
        return {
            key: this.email,
            value: JSON.stringify({
                type: "GetUser",
                path: this.path,
                auth: this.auth,
                data: {
                    email: this.email
                }
            })
        }
    }
}

export class GetAllUserEvent extends CQRSEvent {

    constructor(path: string, auth: string) {
        super(path, auth);
    }

    fromJSON(json: { path: string; auth: string; }) {
        return new GetAllUserEvent(json.path, json.auth);
    }

    toJSON() {
        return {
            key: "No Key",
            value: JSON.stringify({
                type: "GetAllUser",
                path: this.path,
                auth: this.auth,
                data: {
                }
            })
        }
    }
}
