import { Router } from 'express';
import { consumer, consumerConnect } from '@src/controllers/stockController';

const router = Router();

router.post('/disconnect', (_req, res) => {
    console.log('Disconnecting consumer');
    consumer.stop().catch((error) => {
        console.error("Error in disconnect: ", error);
    }).then(() => {
        consumer.disconnect().then(() => {
            res.status(200).send('Disconnected');
        }).catch((error) => {
            console.error("Error in disconnect: ", error);
            res.status(500).send('Error in disconnect');
        });
    });
});

router.post('/subscribe', (_req, res) => {
    console.log('Subscribing to topic');
    consumerConnect().then(() => {
        res.status(200).send('Subscribed');
    }).catch((error) => {
        console.error("Error in subscribe: ", error);
        res.status(500).send('Error in subscribe');
    });
});

export default router;
