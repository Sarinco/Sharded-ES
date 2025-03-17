import { verifyJWT } from "./token";

export function verifyAdmin(req: any, res: any, next: any) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).send("No token provided");
    }

    const decoded = verifyJWT(token);

    if (decoded === "Invalid token") {
        return res.status(401).send("Invalid token");
    }

    const { role, email: added_by, exp } = decoded as any;

    if (exp < Date.now().valueOf() / 1000) {
        return res.status(401).send("Token has expired");
    }

    if (role !== "admin") {
        return res.status(403).send("Unauthorized");
    }

    req.decoded = decoded;
    next();
}
