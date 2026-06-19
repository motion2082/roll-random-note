import SmartRandomNotePlugin from './main';
import { Modal, Notice, PluginSettingTab, Setting, TFolder } from 'obsidian';

export class SmartRandomNoteSettingTab extends PluginSettingTab {
    plugin: SmartRandomNotePlugin;

    constructor(plugin: SmartRandomNotePlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Smart Random Note Settings ' });

        new Setting(containerEl)
            .setName('Open in New Leaf')
            .setDesc('Default setting for opening random notes')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.openInNewLeaf);
                toggle.onChange(async (value) => {
                    this.plugin.settings.openInNewLeaf = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Replace Current Note')
            .setDesc('If enabled, replaces the currently open note when opening a random note')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.replaceCurrentNote);
                toggle.onChange(async (value) => {
                    this.plugin.settings.replaceCurrentNote = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName('Enable Ribbon Icon')
            .setDesc('Place an icon on the ribbon to open a random note from search')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.enableRibbonIcon);
                toggle.onChange(async (value) => {
                    this.plugin.settings.enableRibbonIcon = value;
                    await this.plugin.saveSettings();
                    this.plugin.refreshRibbonIcon();
                });
            });

        new Setting(containerEl)
            .setName('Random Note Folders')
            .setDesc('Each folder added here gets its own "Open Random Note from \'<name>\'" command')
            .addButton((button) => {
                button.setButtonText('Add new Random Note Folder').onClick(async () => {
                    const folderPath = await this.selectFolder();
                    if (folderPath && !this.plugin.settings.randomFolders.some((f) => f.path === folderPath)) {
                        this.plugin.settings.randomFolders.push({
                            path: folderPath,
                            name: `Folder ${this.plugin.settings.randomFolders.length + 1}`,
                        });
                        await this.plugin.saveSettings();
                        await this.plugin.updateFolderCommands();
                        this.display();
                    }
                });
            });

        this.plugin.settings.randomFolders.forEach((folder, index) => {
            new Setting(containerEl)
                .setName(folder.name)
                .setDesc(folder.path)
                .addText((text) => {
                    text.setValue(folder.name).onChange(async (value) => {
                        folder.name = value;
                        await this.plugin.saveSettings();
                        await this.plugin.updateFolderCommands();
                    });
                })
                .addButton((button) => {
                    button.setButtonText('Remove').onClick(async () => {
                        this.plugin.settings.randomFolders.splice(index, 1);
                        await this.plugin.saveSettings();
                        await this.plugin.updateFolderCommands();
                        this.display();
                    });
                });
        });

        new Setting(containerEl).addButton((button) => {
            button
                .setButtonText('Save Changes')
                .setCta()
                .onClick(async () => {
                    await this.plugin.saveSettings();
                    await this.plugin.updateFolderCommands();
                    new Notice('Smart Random Note: Settings saved successfully');
                });
        });
    }

    selectFolder = (): Promise<string> => {
        const folders = this.plugin.app.vault
            .getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder)
            .map((folder) => folder.path);

        return new Promise((resolve) => {
            const modal = new Modal(this.plugin.app);
            modal.contentEl.createEl('h2', { text: 'Select a Folder' });

            const dropdownEl = modal.contentEl.createEl('select');
            folders.forEach((folderPath) => {
                const option = dropdownEl.createEl('option', { text: folderPath });
                option.value = folderPath;
            });

            const confirmButton = modal.contentEl.createEl('button', { text: 'Confirm' });
            confirmButton.addEventListener('click', () => {
                resolve(dropdownEl.value);
                modal.close();
            });

            modal.open();
        });
    };
}
