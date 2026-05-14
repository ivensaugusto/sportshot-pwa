import { Client, Functions, Query } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://apw.simplemsg.net.br/v1')
    .setProject('sportshot')
    .setKey('standard_31d416d2a2cd06175d37cef2c548cbb96496957b15523fed2d478af8678542f176450f88bdba6c75e6d4bd48ce8c860a8c0a39f3deb7bc8788bbee582470acdc3e5d38c18960896588fd73e75dba07c6733f59804ff4c610fec34a47b99b9c4c4f90b68a5f67735869da89c49be3aed0acea2885da067282e84397473d06e17e');

const functions = new Functions(client);

async function checkDeploy() {
    try {
        const deployments = await functions.listDeployments('disparar-notificacoes', [Query.limit(3), Query.orderDesc('$createdAt')]);
        console.log("DEPLOYMENTS:");
        console.log(deployments.deployments.map(d => ({ id: d.$id, status: d.status, createdAt: d.$createdAt })));
        
        const executions = await functions.listExecutions('disparar-notificacoes', [
            Query.orderDesc('$createdAt'),
            Query.limit(3)
        ]);
        console.log("EXECUTIONS:");
        console.log(executions.executions.map(e => ({ id: e.$id, status: e.status, error: e.errors, createdAt: e.$createdAt })));
    } catch (err) {
        console.error(err);
    }
}

checkDeploy();
