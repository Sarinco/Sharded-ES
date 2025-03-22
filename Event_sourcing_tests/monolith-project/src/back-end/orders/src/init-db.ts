
import { client, topicList } from './controllers/orderController';
import { MemberDescription } from 'kafkajs';

const PORT: number = parseInt(process.env.PORT as string);
const group = 'orders-group';

const initDB = async () => {
    try {

        // ADMIN TOPIC CREATION
        const admin = client.admin();
        await admin.connect();

        // Create the topics if they don't exist
        await admin.listTopics().then(async (topics:string[]) => {
            for (let i = 0; i < topicList.length; i++) {
                if (!topics.includes(topicList[i])) {
                    console.log("Creating topic: ", topicList[i]);
                    await admin.createTopics({
                        topics: [{ topic: topicList[i] }],
                    });
                } else {
                    console.log("Topic already exists: ", topicList[i]);
                }
            }
        }).catch((error: any) => {
            console.log("Error in listTopics method: ", error);
        });

        // Reset offset to start from the beginning
        // ALL THE CONSUMER HAVE TO BE DISCONNECTED
        let members: MemberDescription[] = [];
        let memberToReconnect: MemberDescription[] = [];
        let waitToStable = false;

        let groupList = await admin.describeGroups([group]);
        for (let i = 0; i < groupList.groups.length; i++) {
            if (groupList.groups[i].groupId !== group) {
                continue;
            }

            members = groupList.groups[i].members;
            let memberDisconnected: MemberDescription[] = [];
            for (let j = 0; j < groupList.groups[i].members.length; j++) {
                const clientIP = groupList.groups[i].members[j].clientHost;

                const alreadyDisconnected = memberDisconnected.find((member) => member.clientHost === clientIP);
                if (alreadyDisconnected) {
                    waitToStable = true;
                    continue;
                }

                console.log("Disconnecting consumer: ", clientIP);
                await fetch(`http://${clientIP}:${PORT}/kafka/disconnect`, {
                    method: 'POST',
                }).then((response) => {
                    console.log("Response status: ", response.status);
                    if (response.status !== 200) {
                        console.log("Error in disconnecting consumer: ", response);
                        waitToStable = true;
                    }
                    memberDisconnected.push(groupList.groups[i].members[j]);
                    memberToReconnect.push(groupList.groups[i].members[j]);
                }).catch((error) => {
                    console.log("Error in fetch: ", error);
                    waitToStable = true;
                });
            }
        }

        const maxWait = 15;
        let waitCount = 0;
        while (waitToStable && waitCount < maxWait) {
            console.log("Waiting for kafka to stabilize");
            await new Promise(resolve => setTimeout(resolve, 5000));
            waitCount++;

            groupList = await admin.describeGroups([group]);
            for (let i = 0; i < groupList.groups.length; i++) {
                if (groupList.groups[i].groupId !== group) {
                    continue;
                }

                members = groupList.groups[i].members;
                console.log("Members: ", members);
                if (members.length === 0) {
                    console.log("All consumers disconnected");
                    waitToStable = false;
                    break;
                }
            }
        }

        await admin.resetOffsets({
            groupId: group,
            topic: topicList[0],
            earliest: true
        }).then(() => {
            console.log("Offset reset successfully");
        }).catch((error: any) => {
            console.log("Error in resetOffsets method: ", error);
            process.exit(1);
        });

        // Re-subscribe to the previous hosts
        for (let i = 0; i < memberToReconnect.length; i++) {
            const clientIP = memberToReconnect[i].clientHost;
            await fetch(`http://${clientIP}:${PORT}/kafka/subscribe`, {
                method: 'POST',
            }).then((response) => {
                console.log("Response: ", response);
            }).catch((error) => {
                console.log("Error in fetch: ", error);
            });
        }


        process.exit(0);
    } catch (error) {
        console.log("Error in initDB: ", error);
        process.exit(1);
    }
}

initDB().then(() => {
    console.log("DB initialized");
    process.exit(0);
}).catch((error) => {
    console.log("Error: ", error);
});

