import { Color } from "./color.ts";

export type ClientBoardWord = {
    word: string,
    revealed: boolean,
    color: Color | null
};

// ===============================

export type PlayerId = string;

/** Passing `false` will refuse the connection */
export type PlayerConnectedCallback = (id: PlayerId, name: string) => boolean;
export type PlayerDisconnectedCallback = (id: PlayerId) => void;
export type MessageCallback = (id: PlayerId, message: string) => void;

export interface Server {
    onPlayerConnected: (cb: PlayerConnectedCallback) => void;
    onPlayerDisconnected: (cb: PlayerDisconnectedCallback) => void;
    onMessage: (cb: MessageCallback) => void;
    sendBoard: (id: PlayerId, board: ClientBoardWord[]) => void;
    sendMessage: (id: PlayerId, message: string) => void;
    sendBroadcastMessage: (message: string) => void;
    sendRole: (id: PlayerId, teamLead: boolean) => void;
    sendTurn: (id: PlayerId, isYourTurn: boolean) => void;
    start: () => void;
}