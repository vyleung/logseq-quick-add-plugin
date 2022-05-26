import "@logseq/libs";
import { format } from "date-fns";
import dayjs from "dayjs";
import { setDriftlessTimeout } from "driftless";

const settings = [
  {
    key: "Shortcut_AddParentBlock",
    title: "Keyboard shortcut to add a new parent block at the end of the current page",
    description: "This is the keyboard shortcut at add a new parent block to the end of the current page (default: mod+e - Mac: cmd+e | Windows: ctrl+e)",
    type: "string",
    default: "mod+e"
  },
  {
    key: "Shortcut_AddSiblingBlock_Before",
    title: "Keyboard shortcut to add a sibling block before the current block",
    description: "This is the keyboard shortcut to add a sibling block above the current block (default: alt+shift+enter)",
    type: "string",
    default: "alt+shift+enter"
  },
  {
    key: "Shortcut_AddSiblingBlock_After",
    title: "Keyboard shortcut to add a sibling block after the current block",
    description: "This is the keyboard shortcut to add a sibling block below the current block (default: alt+enter)",
    type: "string",
    default: "alt+enter"
  },
  {
    key: "Shortcut_AddChildBlock",
    title: "Keyboard shortcut to add a child block to the current block",
    description: "This is the keyboard shortcut to add a child block to the current block (default: ctrl+alt+enter)",
    type: "string",
    default: "ctrl+alt+enter"
  },
  {
    key: "Shortcut_DuplicateBlock",
    title: "Keyboard shortcut to duplicate the current block",
    description: "This is the keyboard shortcut to duplicate the current block (default: mod+d - Mac: cmd+d | Windows: ctrl+d)",
    type: "string",
    default: "mod+d"
  },
  {
    key: "Shortcut_CopySelectedTextAsBlockRefAlias",
    title: "Keyboard shortcut to copy the selected text with reference to the block it's in",
    description: "This is the keyboard shortcut to copy the selected text with reference to the block it's in (default: mod+alt+c - Mac: cmd+alt+c | Windows: ctrl+alt+c)",
    type: "string",
    default: "mod+alt+c"
  },
  {
    key: "Shortcut_InsertCurrentDateTime",
    title: "Keyboard shortcut to insert the current date and time",
    description: "This is the keyboard shortcut to insert the current date and time using a custom time format (default: mod+alt+d - Mac: cmd+alt+d | Windows: ctrl+alt+d)",
    type: "string",
    default: "mod+alt+d"
  },
  {
    key: "Shortcut_InsertCurrentTime",
    title: "Keyboard shortcut to insert the current time",
    description: "This is the keyboard shortcut to insert the current time using a custom time format (default: mod+alt+t - Mac: cmd+alt+t | Windows: ctrl+alt+t)",
    type: "string",
    default: "mod+alt+t"
  },
  {
    key: "CurrentTimeFormat",
    title: "What time format do you want to use for the current time?",
    description: "Default: hh:mm A (e.g. 01:23 PM) – For information about how to customize the format, go to: https://day.js.org/docs/en/display/format",
    type: "string",
    default: "hh:mm A"
  }
]
logseq.useSettingsSchema(settings);

let last_block_uuid;
let sibling_location;
let blocks_to_duplicate = [];
let current_type;
let current_date;
let current_time;
let selected_text;

function getCurrentDate() {
  logseq.App.getUserConfigs().then(configs => {
    current_date = format(new Date(), configs.preferredDateFormat); 
  });
}

function addParentBlock() {
  logseq.Editor.getCurrentPageBlocksTree().then(page_blocks => {
    // keyboard shortcut was activated in the journals section
    if (page_blocks == null) {
      getCurrentDate();

      setDriftlessTimeout(() => {
        logseq.Editor.getPageBlocksTree(current_date).then(todays_journal_blocks => {
          // if there are no blocks in today's journal page, add a block
          if (todays_journal_blocks.length == 0) {
            logseq.Editor.appendBlockInPage(current_date, "");
          }
          // if there's only 1 block in today's journal page and it doesn't contain content, enter edit mode in the block
          else if ((todays_journal_blocks.length == 1) && (todays_journal_blocks[0].content == "")) {
            last_block_uuid = todays_journal_blocks[0].uuid;
            logseq.Editor.editBlock(last_block_uuid);
          }
          // otherwise, if there are 2+ blocks in today's journal page, get the uuid of the last block and insert a sibling block underneath it
          else {
            last_block_uuid = todays_journal_blocks[todays_journal_blocks.length - 1].uuid;
            logseq.Editor.insertBlock(last_block_uuid, "", {
              sibling: true
            });
          }
        });
      }, 25);
    }
    // keyboard shortcut was activated in regular pages
    else {
      // if there are no blocks in the curent page, add a block
      if (page_blocks.length == 0) {
        logseq.Editor.getCurrentPage().then(page => {
          logseq.Editor.appendBlockInPage(page.uuid, "");
        });
      }
      // if there's only 1 block in page and it doesn't contain content, enter edit mode in the block
      else if ((page_blocks.length == 1) && (page_blocks[0].content == "")) {
        last_block_uuid = page_blocks[0].uuid;
        logseq.Editor.editBlock(last_block_uuid);
      }
      else {
        // otherwise, if there are 2+ blocks in page, get the uuid of the last block and insert a sibling block underneath it
        last_block_uuid = page_blocks[page_blocks.length - 1].uuid;
        logseq.Editor.insertBlock(last_block_uuid, "", {
          sibling: true
        });
      }
    }
  });
}

function addSiblingBlock() {
  logseq.Editor.checkEditing().then(current_block_uuid => {
    // insert sibling block before the current block
    if ((current_block_uuid) && (sibling_location == "before")) {
      logseq.Editor.insertBlock(current_block_uuid, "", {
        before: true,
        sibling: true
      });
    }
    // insert sibling block after the current block
    else if ((current_block_uuid) && (sibling_location == "after")) {
      logseq.Editor.insertBlock(current_block_uuid, "", {
        before: false,
        sibling: true
      });
    }
    else {
      logseq.UI.showMsg("No block selected", "warning");
    }
  });
}

function addChildBlock() {
  logseq.Editor.checkEditing().then(parent_block_uuid => {
    if (parent_block_uuid) {
      // get the last child block from the current block and insert a sibling block underneath it
      logseq.Editor.getBlock(parent_block_uuid, {includeChildren: true}).then(parent_block => {
        if (parent_block.children.length > 0) {
          last_block_uuid = parent_block.children[parent_block.children.length - 1].uuid;
          logseq.Editor.insertBlock(last_block_uuid, "", {
            sibling: true
          });
        }
      });
    }
    else {
      logseq.UI.showMsg("No block selected", "warning");
    }
  });
}

function duplicateBlock() {
  logseq.Editor.checkEditing().then(active_block_uuid => {
    // duplicating one block
    if (active_block_uuid) {
      // create a copy of the current block and insert it as the current block's sibling
      logseq.Editor.getBlock(active_block_uuid, {includeChildren: true}).then(active_block => {
        logseq.Editor.insertBatchBlock(active_block_uuid, active_block, {
          sibling: true
        });
        setDriftlessTimeout(() => {
          logseq.Editor.exitEditingMode();
        }, 50);
      });
    }
    else {
      logseq.Editor.getSelectedBlocks().then(selected_blocks => {
        // duplicating multiple blocks
        if (selected_blocks) {
          // fill an array w/ a copy of the current blocks and insert the blocks as the current block's sibling
          last_block_uuid = selected_blocks[selected_blocks.length - 1].uuid;

          selected_blocks.forEach(selected_block => {
            logseq.Editor.getBlock(selected_block.uuid, {includeChildren: true}).then(block => {
              blocks_to_duplicate.push(block);
            });
          });

          setDriftlessTimeout(() => {
            logseq.Editor.insertBatchBlock(last_block_uuid, blocks_to_duplicate, {
              sibling: true
            });
            setDriftlessTimeout(() => {
              logseq.Editor.exitEditingMode();
              blocks_to_duplicate = [];
            }, 75);
          }, 75);
        }
        else {
          logseq.UI.showMsg("No block(s) selected", "warning");
        }
      });
    }
  });
}

function copySelectedTextAsBlockRefAlias() {
  // get the selected text
  selected_text = parent.document.getSelection().toString();
  
  logseq.Editor.checkEditing().then(selected_text_parent_uuid => {
    if ((selected_text != "") && (selected_text_parent_uuid)) {
      window.focus();

      // format selected text and block uuid and then copy it to the clipboard
      navigator.clipboard.writeText(`[${selected_text}](((${selected_text_parent_uuid})))`);

      setDriftlessTimeout(() => {
        logseq.UI.showMsg("Copied selected text as block ref alias!");
      }, 25);
    }
    else if ((selected_text == "") && (selected_text_parent_uuid)) {
      window.focus();

      // format selected text and block uuid and then copy it to the clipboard
      navigator.clipboard.writeText(`[](((${selected_text_parent_uuid})))`);

      setDriftlessTimeout(() => {
        logseq.UI.showMsg("Copied block ref alias!");
      }, 25);
    }
    else {
      logseq.UI.showMsg("Enter edit mode and try again", "warning");
    }
  });
}

function insertCurrentDateTime() {
  current_time = dayjs().format(logseq.settings.CurrentTimeFormat);

  logseq.Editor.checkEditing().then(block => {
    if ((block) && (current_type == "time only")) {
      logseq.Editor.insertAtEditingCursor(`${current_time}`);
    }
    else if ((block) && (current_type == "date and time")) {
      getCurrentDate();

      setDriftlessTimeout(() => {
        logseq.Editor.insertAtEditingCursor(`[[${current_date}]] at ${current_time}`);
      }, 25);
    }
    else {
      logseq.UI.showMsg("Enter edit mode and try again", "warning");
    }
  });
}

const main = async () => {
  console.log("logseq-quick-add-plugin loaded");

  // register keyboard shortcuts
  function registerKeyboardShortcuts() {
    // add parent block
    logseq.App.registerCommandPalette({
      key: `Shortcut_AddParentBlock`,
      label: "Quick Add: Add a new block at the end of the current page",
      keybinding: {
        binding: logseq.settings.Shortcut_AddParentBlock,
        mode: "global",
      }
    }, async () => {
      addParentBlock();
    });

    // add sibling block (before)
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_AddSiblingBlock_Before`,
      label: "Quick Add: Add a sibling block before the current block",
      keybinding: {
        binding: logseq.settings.Shortcut_AddSiblingBlock_Before,
        mode: "global",
      }
    }, async () => {
      sibling_location = "before";
      addSiblingBlock();
    });

    // add sibling block (after)
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_AddSiblingBlock_After`,
      label: "Quick Add: Add a sibling block after the current block",
      keybinding: {
        binding: logseq.settings.Shortcut_AddSiblingBlock_After,
        mode: "global",
      }
    }, async () => {
      sibling_location = "after";
      addSiblingBlock();
    });

    // add child block
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_AddChildBlock`,
      label: "Quick Add: Add a child block to the current block",
      keybinding: {
        binding: logseq.settings.Shortcut_AddChildBlock,
        mode: "global",
      }
    }, async () => {
      addChildBlock();
    });

    // duplicate block(s)
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_DuplicateBlock`,
      label: "Quick Add: Duplicate the current block(s)",
      keybinding: {
        binding: logseq.settings.Shortcut_DuplicateBlock,
        mode: "global",
      }
    }, async () => {
      duplicateBlock();
    });

    // copy selected text with reference to the block its in
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_CopySelectedTextAsBlockRefAlias`,
      label: "Quick Add: Copy selected text as block reference alias",
      keybinding: {
        binding: logseq.settings.Shortcut_CopySelectedTextAsBlockRefAlias,
        mode: "global",
      }
    }, async () => {
      copySelectedTextAsBlockRefAlias();
    });

    // insert the current date and time
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_InsertCurrentDateTime`,
      label: "Quick Add: Insert the current date and time",
      keybinding: {
        binding: logseq.settings.Shortcut_InsertCurrentDateTime,
        mode: "global",
      }
    }, async () => {
      current_type = "date and time";
      insertCurrentDateTime();
    });

    // insert the current time only
    logseq.App.registerCommandPalette({
      key: `quick-add-Shortcut_InsertCurrentTime`,
      label: "Quick Add: Insert the current time",
      keybinding: {
        binding: logseq.settings.Shortcut_InsertCurrentTime,
        mode: "global",
      }
    }, async () => {
      current_type = "time only";
      insertCurrentDateTime();
    });
  }
  registerKeyboardShortcuts();

  // register slash commands
  function registerSlashCommands() {
    // insert the current date and time
    logseq.Editor.registerSlashCommand("Quick Add: Insert current date and time", async () => {
      current_type = "date and time";
      insertCurrentDateTime();
    });

    // insert the current time only
    logseq.Editor.registerSlashCommand("Quick Add: Insert current time", async () => {
      current_type = "time only";
      insertCurrentDateTime();
    });
  }
  registerSlashCommands();
}

logseq.ready(main).catch(console.error);