// User Class
export class User {
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
}
