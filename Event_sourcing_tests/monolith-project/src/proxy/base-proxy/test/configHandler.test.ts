
import { ConfigManager } from "@src/handlers/configHandler";
import { defaultAction } from "@src/control-plane/interfaces";
import { assert } from "chai";


describe("Filter tree : simple tests", () => {

    let manager = new ConfigManager;
    let default_filter = {action: `[${defaultAction}]`}

    it("Testing proper declaration", () => {
        let tested = manager.matchFilter(["*","*","*"]);
        assert.deepEqual(default_filter, tested);
    })

    it("Addition of simple filter", () => {
        let target = {action: "[eu-be]"};
        let addition = manager.addFilter(["stock", "warehouse", "charleroi", "eu-be"]);

        assert.equal(addition, true);

        assert.deepEqual(target, manager.matchFilter(["stock", "warehouse", "charleroi"]));
        assert.deepEqual(default_filter, manager.matchFilter(["stock", "warehouse", "*"]));
        assert.deepEqual(default_filter, manager.matchFilter(["stock", "*", "*"]));
    })

    it("deletion of simple filter", () => {
        let deletion = manager.deleteFilter(["stock", "warehouse", "charleroi"])

        assert.equal(deletion, true);

        assert.deepEqual(default_filter, manager.matchFilter(["stock", "warehouse", "charleroi"]))
    })

    it("changing default filter value", () => {
        let addition = manager.addFilter(["*", "*", "*", "eu-be"])
        let target = {action: "[eu-be]"};

        assert.equal(addition, true);
        assert.deepEqual(target, manager.matchFilter(["no matter", "whats here", "it should default"]));
    })
})

describe("Filter Tree : Advanced tests", () => {

    it("adding an entry to an existing filter", () => {
        let manager = new ConfigManager;
        manager.addFilter(["stock", "warehouse", "charleroi", "eu-be,eu-it"]);
        //check first if the addition is correct
        assert.deepEqual({action: "[eu-be,eu-it]"}, manager.matchFilter(["stock", "warehouse", "charleroi"]));

        manager.addFilter(["stock", "warehouse", "charleroi", "eu-nl,eu-uk"]);
        let target = {action: "[eu-be,eu-it,eu-nl,eu-uk]"};

        assert.deepEqual(manager.matchFilter(["stock", "warehouse", "charleroi"]), target);
    });

    it("closest match", () => {
        let manager = new ConfigManager;
        manager.addFilter(["stock", "warehouse", "uccle", "eu-be"]);        
        manager.addFilter(["stock", "warehouse", "*", "eu-nl"]);        

        let expected = {action: "[eu-be]"}

        assert.deepEqual(manager.matchFilter(["stock", "warehouse", "uccle"]), expected);

        expected = {action: "[eu-nl]"};

        assert.deepEqual(manager.matchFilter(["stock", "warehouse", "bruxelles"]), expected);
    })

    it("mandatory filters", () => {
        let manager = new ConfigManager;
        manager.addFilter(["stock", "warehouse", "uccle", "eu-be"]);        
        manager.addFilter(["stock", "warehouse", "london", "eu-uk"]);        
        manager.addFilter(["stock", "%", "not needed", "eu-nl"]);        

        let expected = {action: "[eu-be,eu-nl]"}

        assert.deepEqual(manager.matchFilter(["stock", "warehouse", "uccle"]), expected);

        expected = {action: "[eu-uk,eu-nl]"}

        assert.deepEqual(manager.matchFilter(["stock", "warehouse", "london"]), expected);
    })

});