import { TFile, View } from 'obsidian';

// Obsidian's command registry is not part of the public API. This augmentation
// exposes the internal removeCommand method used to clean up per-folder commands.
declare module 'obsidian' {
    interface App {
        commands: {
            removeCommand(commandId: string): void;
        };
    }
}

export type TagFilesMap = { [tag: string]: TFile[] };

export interface SearchDOM {
    getFiles(): TFile[];
}

export interface SearchView extends View {
    dom: SearchDOM;
}

export interface RandomFolder {
    path: string;
    name: string;
}

export interface SmartRandomNoteSettings {
    openInNewLeaf: boolean;
    replaceCurrentNote: boolean;
    enableRibbonIcon: boolean;
    randomFolders: RandomFolder[];
}
