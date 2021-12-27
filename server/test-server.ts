import { Server, PlayerConnectedCallback, PlayerDisconnectedCallback, MessageCallback, PlayerId, ClientBoardWord } from "./server.ts";

class TestServer implements Server {
    playerConnectedCb?: PlayerConnectedCallback;
    playerDisconnectedCb?: PlayerDisconnectedCallback;
    messageCallback?: MessageCallback;

    constructor() {
    }

    onPlayerConnected(cb : PlayerConnectedCallback) {
        this.playerConnectedCb = cb;
    }

    onPlayerDisconnected(cb: PlayerDisconnectedCallback) {
        this.playerDisconnectedCb = cb;
    }

    onMessage(cb: MessageCallback) {
        this.messageCallback = cb; 
    }

    sendBoard(id: PlayerId, board: ClientBoardWord[]) {
        console.log("Sending board to player "+id);
        for(let i=0; i<5; i++) {
            console.log(board[i*5].word, board[i*5+1].word, board[i*5+2].word, board[i*5+3].word, board[i*5+4].word);
        }
    }

    sendMessage(id: PlayerId, message: string) {

    }

    sendBroadcastMessage(message: string) {

    }

    async start() {
        await wait(1000);
        this.playerConnectedCb?.("1","Kurt");
        this.playerConnectedCb?.("2","Kurtan");
        this.playerConnectedCb?.("3"," kurt");
    }
};

export { TestServer };

function wait(ms: number) {
    return new Promise<void>((resolve, _) => {
        setTimeout(() => resolve(), ms);
    })
}