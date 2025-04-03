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


overrideConsole();

const REGION = process.env.REGION || 'no_region';

const MASTER = process.env.MASTER || 'proxy-1';
const CONTROL_PORT = parseInt(process.env.CONTROL_PORT as string) || 6000;
const IS_MASTER = process.env.IS_MASTER || 'false';

let config_manager: ConfigManager;
let control_plane: ControlPlane;


// CONTROL PLANE
// CONTROL PLANE CLIENT
const control_plane_client = new ControlPlaneClient(MASTER, CONTROL_PORT, REGION);
control_plane = control_plane_client;

// Connect to the server
const seconds = 1;
setTimeout(() => {
    control_plane_client.connect().catch((error: any) => {
        console.error('Error connecting to the Control Plane server: ', error);
    }).then(() => {
        config_manager = control_plane_client.config_manager;
        // const config = readFileSync('./src/config.json', 'utf-8');
        // const extracted_config = control_plane.configExtractor(JSON.parse(config));
        //
        // // Set the config in the config manager for Gateway
        // config_manager.setConfig(extracted_config);

        // Send the ID packet to the server
        const id_packet: Buffer = Buffer.from(JSON.stringify({ region: REGION }));
        control_plane_client.sendControl(id_packet, ID_GATEWAY_PACKET);
        console.info('Sent ID packet to Control Plane server');
    });
}, seconds * 1000);


// GATEWAY
const gateway = new DynamicGateway('/app/src/config.json');
console.info('Starting gateway');
gateway.start();
