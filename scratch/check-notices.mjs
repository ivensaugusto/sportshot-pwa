import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint('https://apw.simplemsg.net.br/v1')
    .setProject('sportshot')
    .setKey('standard_31d416d2a2cd06175d37cef2c548cbb96496957b15523fed2d478af8678542f176450f88bdba6c75e6d4bd48ce8c860a8c0a39f3deb7bc8788bbee582470acdc3e5d38c18960896588fd73e75dba07c6733f59804ff4c610fec34a47b99b9c4c4f90b68a5f67735869da89c49be3aed0acea2885da067282e84397473d06e17e');

const databases = new Databases(client);

async function checkNotices() {
    try {
        const res = await databases.listDocuments('sportshot-db', 'notices');
        console.log("Total notices:", res.total);
        console.log("Notices:", res.documents);
    } catch (err) {
        console.error(err);
    }
}
checkNotices();
