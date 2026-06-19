import { MarkdownView, Plugin, TFile } from 'obsidian';
import { getTagFilesMap, randomElement } from './utilities';
import { SmartRandomNoteSettingTab } from './settingTab';
import { RandomFolder, SearchView, SmartRandomNoteSettings } from './types';
import { SmartRandomNoteNotice } from './smartRandomNoteNotice';
import { OpenRandomTaggedNoteModal } from './openRandomTaggedNoteModal';

export default class SmartRandomNotePlugin extends Plugin {
    settings: SmartRandomNoteSettings = {
        openInNewLeaf: true,
        replaceCurrentNote: false,
        enableRibbonIcon: true,
        randomFolders: [],
    };
    ribbonIconEl: HTMLElement | undefined = undefined;
    folderCommands: string[] = [];

    async onload(): Promise<void> {
        console.log('loading smart-random-note');

        await this.loadSettings();

        this.addSettingTab(new SmartRandomNoteSettingTab(this));

        this.addCommand({
            id: 'open-random-note',
            name: 'Open Random Note',
            callback: this.handleOpenRandomNote,
        });

        this.addCommand({
            id: 'open-tagged-random-note',
            name: 'Open Tagged Random Note',
            callback: this.handleOpenTaggedRandomNote,
        });

        this.addCommand({
            id: 'open-random-note-from-search',
            name: 'Open Random Note from Search',
            callback: this.handleOpenRandomNoteFromSearch,
        });

        this.addCommand({
            id: 'insert-link-to-random-note-at-cursor',
            name: 'Insert Link at Cursor to Random Note from Search',
            callback: this.handleInsertLinkFromSearch,
        });

        await this.updateFolderCommands();
    }

    onunload = (): void => {
        console.log('unloading smart-random-note');
        this.removeAllFolderCommands();
    };

    handleOpenRandomNote = async (): Promise<void> => {
        const markdownFiles = this.app.vault.getMarkdownFiles();

        this.openRandomNote(markdownFiles);
    };

    handleOpenTaggedRandomNote = (): void => {
        const tagFilesMap = getTagFilesMap(this.app);

        const tags = Object.keys(tagFilesMap);
        const modal = new OpenRandomTaggedNoteModal(this.app, tags);

        modal.submitCallback = async (selectedTag: string): Promise<void> => {
            const taggedFiles = tagFilesMap[selectedTag];
            await this.openRandomNote(taggedFiles);
        };

        modal.open();
    };

    handleOpenRandomNoteFromSearch = async (): Promise<void> => {
        const searchView = this.app.workspace.getLeavesOfType('search')[0]?.view as SearchView;

        if (!searchView) {
            new SmartRandomNoteNotice('The core search plugin is not enabled', 5000);
            return;
        }

        const searchResults = searchView.dom.getFiles();

        if (!searchResults.length) {
            new SmartRandomNoteNotice('No search results available', 5000);
            return;
        }

        await this.openRandomNote(searchResults);
    };

    handleInsertLinkFromSearch = async (): Promise<void> => {
        const searchView = this.app.workspace.getLeavesOfType('search')[0]?.view as SearchView;

        if (!searchView) {
            new SmartRandomNoteNotice('The core search plugin is not enabled', 5000);
            return;
        }

        const searchResults = searchView.dom.getFiles();

        if (!searchResults.length) {
            new SmartRandomNoteNotice('No search results available', 5000);
            return;
        }

        await this.insertRandomLinkAtCursor(searchResults);
    };

    handleOpenRandomNoteFromFolder = async (folder: RandomFolder): Promise<void> => {
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const filteredFiles = markdownFiles.filter((file) => file.path.startsWith(folder.path));

        await this.openRandomNote(filteredFiles);
    };

    openRandomNote = async (files: TFile[]): Promise<void> => {
        const markdownFiles = files.filter((file) => file.extension === 'md');

        if (!markdownFiles.length) {
            new SmartRandomNoteNotice("Can't open note. No markdown files available to open.", 5000);
            return;
        }

        const fileToOpen = randomElement(markdownFiles);
        const openInNewLeaf = this.settings.replaceCurrentNote ? false : this.settings.openInNewLeaf;
        await this.app.workspace.openLinkText(fileToOpen.basename, '', openInNewLeaf, {
            active: true,
        });
    };

    insertRandomLinkAtCursor = async (files: TFile[]): Promise<void> => {
        const fileToLink = randomElement(files);
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) {
            new SmartRandomNoteNotice("Can't insert link. No active note to insert link into", 5000);
            return;
        }
        const viewState = activeLeaf.getViewState();
        const canEdit = viewState.type === 'markdown' && viewState.state && viewState.state.mode == 'source';

        if (!canEdit) {
            new SmartRandomNoteNotice("Can't insert link. The active file is not a markdown file in edit mode.", 5000);
            return;
        }

        const markdownView = activeLeaf.view as MarkdownView;
        const cursorPos = markdownView.editor.getCursor();
        const textToInsert = `[[${fileToLink.name}]]`;
        markdownView.editor.replaceRange(textToInsert, cursorPos);
    };

    loadSettings = async (): Promise<void> => {
        const loadedSettings = (await this.loadData()) as SmartRandomNoteSettings;
        if (loadedSettings) {
            Object.assign(this.settings, loadedSettings);
        }
        this.refreshRibbonIcon();
    };

    saveSettings = async (): Promise<void> => {
        await this.saveData(this.settings);
    };

    refreshRibbonIcon = (): void => {
        this.ribbonIconEl?.remove();
        if (this.settings.enableRibbonIcon) {
            this.ribbonIconEl = this.addRibbonIcon(
                'dice',
                'Open Random Note from Search',
                this.handleOpenRandomNoteFromSearch,
            );
        }
    };

    updateFolderCommands = async (): Promise<void> => {
        this.removeAllFolderCommands();

        this.settings.randomFolders.forEach((folder, index) => {
            const commandId = `open-random-note-folder-${index + 1}`;
            this.addCommand({
                id: commandId,
                name: `Open Random Note from '${folder.name}'`,
                callback: () => this.handleOpenRandomNoteFromFolder(folder),
            });
            this.folderCommands.push(commandId);
        });
    };

    removeAllFolderCommands = (): void => {
        for (const commandId of this.folderCommands) {
            this.app.commands.removeCommand(commandId);
        }
        this.folderCommands = [];
    };
}
