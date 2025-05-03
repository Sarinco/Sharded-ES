import express, { Request, Response } from 'express';
import { readFileSync } from 'node:fs';

// For module aliasing
require('module-alias/register');

// Custom imports
import { overrideConsole } from '@src/helper/console';
import { ControlPlaneClient } from '@src/control-plane/client';
import { ConfigManager } from '@src/handlers/configHandler';
import {
    ID_GATEWAY_PACKET,
} from '@src/control-plane/interfaces';
import { ControlPlane } from '@src/control-plane/control-plane';
import { DynamicGateway } from '@src/gateway/dynamic-gateway';
import axios from 'axios';
import { error } from 'node:console';



overrideConsole();

const REGION = process.env.REGION || 'no_region';

const MASTER = process.env.MASTER || 'proxy-1';
const CONTROL_PORT = parseInt(process.env.CONTROL_PORT as string) || 6000;

let config_manager: ConfigManager;
let control_plane: ControlPlane;


// CONTROL PLANE
// CONTROL PLANE CLIENT
const control_plane_client = new ControlPlaneClient(MASTER, CONTROL_PORT, REGION);
control_plane = control_plane_client;

// main
waitForMaster()
    .then(() => {
        console.info("Attempting connection");
        connect_master();
    })
    .catch((error: any) => {
        console.error(error);
    });

// Function to ping the master until it comes online
async function waitForMaster(interval: number = 10000, retries: number = 20): Promise<void>{
    const url = `http://${MASTER}/health`;
    console.info("Trying to reach master at : ", url);
    while (retries != 0 ){
        try {
            let response = await axios.get(url);
            if (response.status == 200) {
                console.log("Service reachable");
                break;
            }
        } catch (error) {
            console.log("Service not reachable, retry in :", interval/1000, " seconds");
            retries--;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

//Function to connect to the master
function connect_master() {
    control_plane_client.connect().catch((error: any) => {
        console.error('Error connecting to the Control Plane server: ', error);
    }).then(() => {
        config_manager = control_plane_client.config_manager;

        // Send the ID packet to the server
        const id_packet: Buffer = Buffer.from(JSON.stringify({ region: REGION }));
        control_plane_client.sendControl(id_packet, ID_GATEWAY_PACKET);
        console.info('Sent ID packet to Control Plane server');

        // GATEWAY
        const gateway = new DynamicGateway('/app/src/config.json', control_plane_client);
        console.info('Starting gateway');
        gateway.start();
    });
}