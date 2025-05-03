import { expect } from "chai";
import { describe, it } from "mocha";
import {
    adminLogin,
    deleteUser,
    loginUser,
    registerUser,
} from "./index.ts";
import { 
    MeasurementService,
    gateways,
} from "../measurer.ts";


let admin_token = "";
const email = "mocha@test.be";
const password = "password";

const measurementService = MeasurementService.getInstance();
const measurementServiceUser = measurementService.createChild("users");


describe("Login the admin", () => {
    it("Should return a token on successful login", async () => {
        for (const gateway of gateways) {
            try {
                const token = await measurementServiceUser.measure(() => adminLogin(gateway), "adminLogin", "Login the admin", gateway, gateway);
                expect(token).to.be.a("string");
                expect(token).to.not.be.empty;
                admin_token = token;
            } catch (error) {
                expect.fail(`Login failed for ${gateway}: ${error}`);
            }
        }
    });

    it("Should throw an error on failed login", async () => {
        for (const gateway of gateways) {
            try {
                await loginUser(gateway, 'admin@test.be', 'wrongpassword');
                expect.fail(`Login should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });
});

describe("Register a user", () => {
    const email = "mocha@test.be";
    const password = "password";
    it("Should return a token on successful registration", async () => {
        let index = 0;
        for (const gateway of gateways) {
            let gateway_email = `${index++}_${email}`;
            try {
                const token = await registerUser(gateway, gateway_email, password);
                expect(token).to.be.a("string");
                expect(token).to.not.be.empty;
            } catch (error) {
                expect.fail(`Registration failed for ${gateway}: ${error}`);
            }
        }
    });

    it("Should throw an error on failed registration", async () => {
        let index = 0;
        for (const gateway of gateways) {
            let gateway_email = `${index++}_${email}`;
            try {
                await registerUser(gateway, gateway_email, password);
                expect.fail(`Registration should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });
});

describe("Login a user", () => {
    it("Should return a token on successful login", async () => {
        let index = 0;
        for (const gateway of gateways) {
            let gateway_email = `${index++}_${email}`;
            try {
                const token = await loginUser(gateway, gateway_email, password);
                expect(token).to.be.a("string");
                expect(token).to.not.be.empty;
            } catch (error) {
                expect.fail(`Login failed for ${gateway}: ${error}`);
            }
        }
    });

    it("Should throw an error on failed login", async () => {
        let index = 0;
        for (const gateway of gateways) {
            let gateway_email = `${index++}_${email}`;
            try {
                await loginUser(gateway, gateway_email, 'wrongpassword');
                expect.fail(`Login should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });

    it("Should throw an error on failed login with non-existing user", async () => {
        for (const gateway of gateways) {
            try {
                await loginUser(gateway, 'nonexisting', password);
                expect.fail(`Login should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });
});

describe("Delete a user", () => {
    it("Should delete the user successfully", async () => {
        let index = 0;
        for (const gateway of gateways) {
            let gateway_email = `${index++}_${email}`; 
            try {
                await deleteUser(gateway, gateway_email, admin_token);
            } catch (error) {
                expect.fail(`Delete failed for ${gateway}: ${error}`);
            }
        }
    });
    it("Should throw an error on failed delete", async () => {
        let index = 0;
        for (const gateway of gateways) {
            let gateway_email = `${index++}_${email}`; 
            try {
                await deleteUser(gateway, gateway_email, admin_token);
                expect.fail(`Delete should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });
    it("Should throw an error on failed delete with non-existing user", async () => {
        for (const gateway of gateways) {
            try {
                await deleteUser(gateway, 'nonexisting', admin_token);
                expect.fail(`Delete should have failed for ${gateway}`);
            } catch (error) {
                expect(error).to.be.an("error");
            }
        }
    });
});
