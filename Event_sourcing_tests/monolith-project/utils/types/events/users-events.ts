
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
