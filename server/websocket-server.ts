import { WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.3/mod.ts";
import { Server, PlayerId, PlayerConnectedCallback, PlayerDisconnectedCallback, MessageCallback, ClientBoardWord } from './server.ts';
import "./arrayHelpers.ts";

type Client = {
    ws: WebSocketClient,
    id: PlayerId,
    accepted: boolean
};

export class WebsocketServer implements Server {
    webSocketServer?: WebSocketServer;
    clients: Client[];
    nextId: number;

    playerConnectedCallback?: PlayerConnectedCallback;
    playerDisconnectedCallback?: PlayerDisconnectedCallback;
    messageCallback?: MessageCallback;

    constructor() {
        this.clients = [];
        this.nextId = 100;
    }
    
    onPlayerConnected(cb: PlayerConnectedCallback) { this.playerConnectedCallback = cb; }
    onPlayerDisconnected(cb: PlayerDisconnectedCallback) { this.playerDisconnectedCallback = cb; }
    onMessage(cb: MessageCallback) { this.messageCallback = cb; }

    start() {
        this.webSocketServer = new WebSocketServer(8080);
        this.webSocketServer.on("error", console.log);
        this.webSocketServer.on("connection", (ws: WebSocketClient) => {
            this.tryRegisterClient(ws);
        });
    }

    sendBoard(id: PlayerId, board: ClientBoardWord[]) {
        let client = this.clients.findOrCrash(c => c.id === id);
        const jsonMsg = JSON.stringify({ type: "board", value: board });
        client.ws.send(jsonMsg);
    }

    sendMessage(id: PlayerId, message: string) {
        let client = this.clients.findOrCrash(c => c.id === id);
        const jsonMsg = JSON.stringify({ type: "text", value: message })
        client.ws.send(jsonMsg);
    }

    sendBroadcastMessage(message: string) {
        for(let client of this.clients) {
            this.sendMessage(client.id, message);
        }
    }

    sendRole(id: PlayerId, teamLead: boolean) {
        let client = this.clients.findOrCrash(c => c.id === id);
        const jsonMsg = JSON.stringify({ type: "teamLead", value: teamLead });
        client.ws.send(jsonMsg);
    }

    sendTurn(id: PlayerId, isYourTurn: boolean) {
        let client = this.clients.findOrCrash(c => c.id === id);
        const jsonMsg = JSON.stringify({ type: "yourTurn", value: isYourTurn });
        client.ws.send(jsonMsg);
    }

    tryRegisterClient(ws: WebSocketClient) {
        const id = String(this.nextId++);
        const client = {ws, id, accepted: false};
        this.clients.push(client);
  
        // Expect first message to contain "name"
        //
        ws.on("message", (msg: string) => {
            let msgTruncated = msg.substring(0,30);
            if(client.accepted) {
                this.messageCallback?.(id, msgTruncated);
            } else {
                const cleanPlayerName = msgTruncated.replace(/_/g,"__");
                if(this.playerConnectedCallback?.(id, cleanPlayerName)) {
                    client.accepted = true;
                } else {
                    const clientIndex = this.clients.findIndex(c => c.id === id);
                    this.clients.splice(clientIndex, 1);
                    ws.close(1337);
                }
            }
        });

        ws.on("close", () => {
            const clientIndex = this.clients.findIndex(c => c.id === id);
            this.clients.splice(clientIndex, 1);
            this.playerDisconnectedCallback?.(id);
        });
    }
};