//#region SharedConsts
class SharedConsts {
  static MODULE_TITLE = "Plutonium";
  static MODULE_TITLE_FAKE = "SRD: Enhanced";
  static MODULE_ID = "plutonium";
  static MODULE_ID_FAKE = "srd5e";

  static PACK_NAME_CREATURES = "creatures";
  static PACK_NAME_SPELLS = "spells";
  static PACK_NAME_ITEMS = "items";

  static MODULE_LOCATION = `modules/${SharedConsts.MODULE_ID}`;

  static SYSTEM_ID_DND5E = "dnd5e";
}
//#endregion

//#region ConfigConsts
class ConfigConsts {

	static _PACK_IDS__SRD_CREATURES = [`${SharedConsts.SYSTEM_ID_DND5E}.monsters`];
	static _PACK_IDS__SRD_CREATURE_FEATURES = [`${SharedConsts.SYSTEM_ID_DND5E}.monsterfeatures`];

	static _PACK_IDS__SRD_CLASSES = [`${SharedConsts.SYSTEM_ID_DND5E}.classes`];
	static _PACK_IDS__SRD_SUBCLASSES = [`${SharedConsts.SYSTEM_ID_DND5E}.subclasses`];
	static _PACK_IDS__SRD_CLASS_FEATURES = [`${SharedConsts.SYSTEM_ID_DND5E}.classfeatures`];

	static _PACK_IDS__SRD_ITEMS = [`${SharedConsts.SYSTEM_ID_DND5E}.items`, `${SharedConsts.SYSTEM_ID_DND5E}.tradegoods`];

	static _PACK_IDS__SRD_SPELLS = [`${SharedConsts.SYSTEM_ID_DND5E}.spells`];

	static _PACK_IDS__SRD_OPTIONALFEATURES = [`${SharedConsts.SYSTEM_ID_DND5E}.classfeatures`];

	static _PACK_IDS__SRD_RACES_AND_RACE_FEATURES = [`${SharedConsts.SYSTEM_ID_DND5E}.races`];

	static _PACK_IDS__SRD_BACKGROUNDS_AND_BACKGROUND_FEATURES = [`${SharedConsts.SYSTEM_ID_DND5E}.backgrounds`];

	static _PACK_IDS__SRD_TABLES = [`${SharedConsts.SYSTEM_ID_DND5E}.tables`];
	
		static _PACK_IDS__PaBTSO_CREATURES = [`dnd-phandelver-below.pbso-bestiary`];

	static _PACK_IDS__PaBTSO_ITEMS = [`dnd-phandelver-below.pbso-items`, `dnd-phandelver-below.pbso-player-options`];

	static _PACK_IDS__PaBTSO_BACKGROUNDS_AND_BACKGROUND_FEATURES = [`dnd-phandelver-below.pbso-player-options`];
	
		static _PACK_IDS__TCE_CREATURES = [`dnd-tashas-cauldron.tcoe-actors`];

	static _PACK_IDS__TCE_CLASSES = [`dnd-tashas-cauldron.tcoe-character-options`];
	static _PACK_IDS__TCE_SUBCLASSES = [`dnd-tashas-cauldron.tcoe-character-options`];
	static _PACK_IDS__TCE_CLASS_FEATURES = [`dnd-tashas-cauldron.tcoe-character-options`];

	static _PACK_IDS__TCE_ITEMS = [`dnd-tashas-cauldron.tcoe-magic-items`];

	static _PACK_IDS__TCE_SPELLS = [`dnd-tashas-cauldron.tcoe-character-options`];

	static _PACK_IDS__TCE_OPTIONALFEATURES = [`dnd-tashas-cauldron.tcoe-character-options`];

	static _PACK_IDS__TCE_FEATS = [`dnd-tashas-cauldron.tcoe-character-options`];
	

  static ["_flushCaches"]() {
    this._DEFAULT_CONFIG = null;
    this._DEFAULT_CONFIG_SORTED = null;
    this._DEFAULT_CONFIG_SORTED_FLAT = null;
  }
  static ['_IMPORTERS'] = {};
  static ["registerImporter"]({
    id: _0x17cd9e,
    name: _0x948c81
  }) {
    this._IMPORTERS[_0x17cd9e] = _0x948c81;
    this._flushCaches();
  }
  static ["_template_getImporterToggles"]() {
    return {
      'hiddenImporterIds': {
        'name': "Hidden Importers",
        'help': "Importers which should not be shown in the Import Wizard UI.",
        'default': {
          'background-features': true,
          'race-and-subrace-features': true
        },
        'type': 'multipleChoice',
        'choices': Object.entries(this._IMPORTERS).map(([_0x40fcfd, _0x286521]) => ({
          'name': _0x286521,
          'value': _0x40fcfd
        })).sort(({
          name: _0x5ca503
        }, {
          name: _0x44f71d
        }) => SortUtil.ascSortLower(_0x5ca503, _0x44f71d))
      }
    };
  }
  static ['_getModelBarAttributes'](_0x2c6d2c) {
    if (!_0x2c6d2c) {
      return [];
    }
    return Object.values(TokenDocument.implementation.getTrackedAttributeChoices(TokenDocument.implementation.getTrackedAttributes(_0x2c6d2c))).flat();
  }
  static ['_template_getEntityOwnership'](helpText) {
    const ownership = MiscUtil.copy(ConfigConsts._TEMPLATE_ENTITY_OWNERSHIP);
    ownership.values = Util.Fvtt.getOwnershipEnum();
    ownership.help = helpText;
    return ownership;
  }
  static ["_template_getTokenSettings"]({
    actorType: _0x1701bd
  }) {
    return {
      'tokenNameDisplay': {
        'name': "Token Name Display Mode",
        'help': "The default Display Name mode for imported tokens.",
        'default': 0x14,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, ...Object.entries({
          ...CONST.TOKEN_DISPLAY_MODES
        }).sort(([, _0x11b4dd], [, _0x418ae3]) => SortUtil.ascSort(_0x11b4dd, _0x418ae3)).map(([_0x1c91ac, _0x536776]) => ({
          'value': _0x536776,
          'fnGetName': () => game.i18n.localize('TOKEN.DISPLAY_' + _0x1c91ac)
        }))]
      },
      'tokenDisposition': {
        'name': "Token Disposition",
        'help': "The default Token Disposition mode for imported tokens.",
        'default': -0x1,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, ...Object.entries(CONST.TOKEN_DISPOSITIONS).sort(([, _0x153b2c], [, _0x397446]) => SortUtil.ascSort(_0x153b2c, _0x397446)).map(([_0x2e1787, _0x29a452]) => ({
          'value': _0x29a452,
          'fnGetName': () => game.i18n.localize("TOKEN.DISPOSITION." + _0x2e1787)
        }))]
      },
      'tokenLockRotation': {
        'name': "Token Lock Rotation",
        'help': "The default Lock Rotation mode for imported tokens.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': 'enum',
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenIsAddVision': {
        'name': "Enable Token Vision",
        'help': "Enable vision for tokens.",
        'default': ConfigConsts.C_BOOL_ENABLED,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_BOOL_DISABLED,
          'name': "Disabled"
        }, {
          'value': ConfigConsts.C_BOOL_ENABLED,
          'name': 'Enabled'
        }]
      },
      'tokenSightRange': {
        'name': "Token Vision Range",
        'help': "How token Vision Range should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': 'enum',
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenSightVisionMode': {
        'name': "Token Vision Mode",
        'help': "How token Vision Mode should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenSightAngle': {
        'name': "Token Sight Angle",
        'help': "How token Sight Angle (Degrees) should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenDetectionModes': {
        'name': "Token Detection Modes",
        'help': "How token Detection Modes should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenVisionSaturation': {
        'name': "Token Vision Saturation",
        'help': "How token vision Saturation should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenDimLight': {
        'name': "Token Dim Light Radius",
        'help': "How token Dim Light Radius (Distance) should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenBrightLight': {
        'name': "Token Bright Light Radius",
        'help': "How token Bright Light Radius (Distance) should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenLightAngle': {
        'name': "Token Light Emission Angle",
        'help': "How token Light Emission (Angle) should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': 'enum',
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenLightColor': {
        'name': "Token Light Color",
        'help': "How token Light Color should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenLightAlpha': {
        'name': "Token Light Intensity",
        'help': "How token Color Intensity should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenLightAnimationType': {
        'name': "Token Light Animation Type",
        'help': "How token Light Animation Type should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': 'enum',
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenLightAnimationSpeed': {
        'name': "Token Light Animation Speed",
        'help': "How token Light Animation Speed should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': "enum",
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenLightAnimationIntensity': {
        'name': "Token Light Animation Intensity",
        'help': "How token Light Animation Intensity should be set.",
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'type': 'enum',
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }]
      },
      'tokenBarDisplay': {
        'name': "Token Bar Display Mode",
        'help': "The default Display Bars mode for imported tokens.",
        'default': 0x28,
        'type': 'enum',
        'values': [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, {
          'value': 0x0,
          'name': "None"
        }, {
          'value': 0xa,
          'name': 'Control'
        }, {
          'value': 0x14,
          'name': "Owner Hover"
        }, {
          'value': 0x1e,
          'name': 'Hover'
        }, {
          'value': 0x28,
          'name': 'Owner'
        }, {
          'value': 0x32,
          'name': "Always"
        }]
      },
      'tokenBar1Attribute': {
        'name': "Token Bar 1 Attribute",
        'help': "The default token bar 1 attribute for imported tokens.",
        'default': "attributes.hp",
        'type': "enum",
        'values': () => [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, ...ConfigConsts._getModelBarAttributes(_0x1701bd)],
        'isNullable': true
      },
      'tokenBar2Attribute': {
        'name': "Token Bar 2 Attribute",
        'help': "The default token bar 2 attribute for imported tokens.",
        'default': null,
        'type': "enum",
        'values': () => [{
          'value': ConfigConsts.C_USE_GAME_DEFAULT,
          'name': "Use game setting"
        }, ...ConfigConsts._getModelBarAttributes(_0x1701bd)],
        'isNullable': true
      },
      'tokenScale': {
        'name': "Token Scale",
        'help': "The default token scale for imported tokens.",
        'default': null,
        'type': "number",
        'placeholder': "(Use default)",
        'min': 0.2,
        'max': 0x3,
        'isNullable': true
      },
      'isTokenMetric': {
        'name': "Convert Token Vision Ranges to Metric",
        'help': "Whether or not token vision range units should be converted to an approximate metric equivalent (5 feet ≈ 1.5 metres).",
        'default': false,
        'type': "boolean"
      }
    };
  }
  static ["_template_getSceneImportSettings"]() {
    return {
      'scenePadding': {
        'name': "Scene Padding",
        'help': "The amount of scene padding to apply when creating a scene.",
        'default': 0x0,
        'type': "number",
        'min': 0x0,
        'max': 0.5
      },
      'sceneBackgroundColor': {
        'name': "Scene Background Color",
        'help': "The background color to apply when creating a scene.",
        'default': "#222222",
        'type': "color"
      },
      'isSceneTokenVision': {
        'name': "Scene Token Vision",
        'help': "Whether or not token vision should be enabled for a created scene.",
        'default': true,
        'type': "boolean"
      },
      'isSceneFogExploration': {
        'name': "Scene Fog Exploration",
        'help': "Whether or not fog exploration should be enabled for a created scene.",
        'default': true,
        'type': "boolean"
      },
      'isSceneAddToNavigation': {
        'name': "Add Scenes to Navigation",
        'help': "Whether or not a created scene should be added to the navigation bar.",
        'default': false,
        'type': "boolean"
      },
      'isSceneGenerateThumbnail': {
        'name': "Generate Scene Thumbnails",
        'help': "Whether or not a thumbnail should be generated for a created scene. Note that this greatly slows down the scene creation process.",
        'default': true,
        'type': "boolean"
      },
      'isSceneGridMetric': {
        'name': "Convert Scene Grid Distances to Metric",
        'help': "Whether or not scene grid distances should be converted to an approximate metric equivalent (" + ConfigConsts._DISP_METRIC_FEET + "; " + ConfigConsts._DISP_METRIC_MILES + ').',
        'default': false,
        'type': "boolean"
      }
    };
  }
  static ["_template_getActiveEffectsDisabledTransferSettings"]({
    name: _0x535a83
  }) {
    return {
      'setEffectDisabled': {
        'name': "Override Effect &quot;Disabled&quot; Value",
        'help': "If set, overrides the \"Disabled\" value present on any effects tied to imported " + _0x535a83 + '.',
        'type': 'enum',
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'compatibilityModeValues': {
          [UtilCompat.MODULE_MIDI_QOL]: {
            'value': ConfigConsts.C_USE_PLUT_VALUE,
            'name': "Allow importer to set"
          }
        },
        'values': [{
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }, {
          'value': ConfigConsts.C_BOOL_DISABLED,
          'name': "Set to \"False\""
        }, {
          'value': ConfigConsts.C_BOOL_ENABLED,
          'name': "Set to \"True\""
        }]
      },
      'setEffectTransfer': {
        'name': "Override Effect &quot;Transfer&quot; Value",
        'help': "If set, overrides the \"Transfer to Actor\" value present on any effects tied to imported " + _0x535a83 + '.',
        'type': 'enum',
        'default': ConfigConsts.C_USE_PLUT_VALUE,
        'compatibilityModeValues': {
          [UtilCompat.MODULE_MIDI_QOL]: {
            'value': ConfigConsts.C_USE_PLUT_VALUE,
            'name': "Allow importer to set"
          }
        },
        'values': [{
          'value': ConfigConsts.C_USE_PLUT_VALUE,
          'name': "Allow importer to set"
        }, {
          'value': ConfigConsts.C_BOOL_DISABLED,
          'name': "Set to \"False\""
        }, {
          'value': ConfigConsts.C_BOOL_ENABLED,
          'name': "Set to \"True\""
        }]
      }
    };
  }
  static ["_template_getMinimumRole"]({
    name: _0x2cb847,
    help: _0x713a
  }) {
    const _0xdadcbd = MiscUtil.copy(ConfigConsts._TEMPALTE_MINIMUM_ROLE);
    _0xdadcbd.values = Util.Fvtt.getMinimumRolesEnum();
    _0xdadcbd.name = _0x2cb847;
    _0xdadcbd.help = _0x713a;
    return _0xdadcbd;
  }
  static ['_template_getModuleFauxCompendiumIndexSettings']({
    moduleName: _0x5afcb7
  }) {
    return {
      'isEnabled': {
        'name': "Enabled",
        'help': "If enabled, and the " + _0x5afcb7 + " module is active, Plutonium content will be indexed by " + _0x5afcb7 + '.',
        'default': true,
        'type': "boolean",
        'isReloadRequired': true
      },
      'isFilterSourcesUa': {
        'name': "Exclude UA/etc.",
        'help': "If Unearthed Arcana and other unofficial source content should be excluded from the index.",
        'default': true,
        'type': "boolean",
        'isReloadRequired': true
      }
    };
  }
  static ["_template_getActorImportOverwriteSettings"]() {
    return {
      'isDisableActorOverwriteWarning': {
        'name': "Disable Actor Overwrite Warning",
        'help': "Disable the warning confirmation dialogue shown when importing to an existing actor.",
        'default': false,
        'type': "boolean",
        'isPlayerEditable': true
      }
    };
  }
  static ["_template_getTargetTemplatePrompt"]({
    namePlural: _0x1f80cf
  }) {
    return {
      'isTargetTemplatePrompt': {
        'name': "Enable &quot;Template Prompt&quot;s",
        'help': "If enabled, the \"Template Prompt\" option will be set on imported " + _0x1f80cf + '.',
        'default': true,
        'type': "boolean",
        'isPlayerEditable': true
      }
    };
  }
  static _DEFAULT_CONFIG = null;
  static getDefaultConfig_ () {
		return this._DEFAULT_CONFIG = this._DEFAULT_CONFIG || {
			ui: {
				name: "UI",
				settings: {
					isStreamerMode: {
						name: "Streamer Mode",
						help: `Remove identifiable 5etools/Plutonium references from the UI, and replaces them with "SRD Enhanced."`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
						isPlayerEditable: true,
					},
					colorScheme: {
						name: "Preferred Color Scheme",
						help: `Specify whether you prefer user interface elements to render using a light theme or a dark theme. Not all interface elements support this preference.`,
						default: ConfigConsts.C_THEME_MODE_BROWSER,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_THEME_MODE_BROWSER,
								name: "Browser Default",
							},
							{
								value: ConfigConsts.C_THEME_MODE_DAY,
								name: "Light",
							},
							{
								value: ConfigConsts.C_THEME_MODE_NIGHT,
								name: "Dark",
							},
						],
					},
					isShowPopout: {
						name: "Enable Sheet Popout Buttons",
						help: `Add a "Popout" button to sheet headers, which opens the sheet as a popup browser window.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactWindowBar: {
						name: "Compact Header Buttons",
						help: `Re-style header buttons to better support the compact, no-text buttons used by Plutonium.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactDirectoryButtons: {
						name: "Compact Directory Buttons",
						help: `Reduce the height of "Create X"/"Create Folder" buttons in the directory, to offset the additional space requirements of Plutonium's UI.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactChat: {
						name: "Compact Chat",
						help: "Make various tweaks to the appearance of chat, in order to fit more on-screen. Hold down SHIFT while hovering over a message to expand it, revealing its header and delete button.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactScenes: {
						name: "Compact Scenes Directory",
						help: "Reduce the height of scene thumbnails in the Scenes Directory, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactActors: {
						name: "Compact Actors Directory",
						help: "Reduce the height of Actors Directory directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactItems: {
						name: "Compact Items Directory",
						help: "Reduce the height of Items Directory directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactJournal: {
						name: "Compact Journal Entries",
						help: "Reduce the height of Journal Entries directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactTables: {
						name: "Compact Rollable Tables",
						help: "Reduce the height of Rollable Tables directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactCards: {
						name: "Compact Card Stacks",
						help: "Reduce the height of Card Stacks directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactCompendiums: {
						name: "Compact Compendium Packs",
						help: "Reduce the height of Compendium Packs directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isCompactMacros: {
						name: "Compact Macros",
						help: "Reduce the height of Macro directory items, to fit more on-screen.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isLeftAlignSceneNames: {
						name: "Left-Align Scene Names",
						help: "Left-align scene names in the Scenes Directory.",
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isHidePlutoniumDirectoryButtons: {
						name: "Hide Directory Buttons",
						help: `Hide the Plutonium directory buttons.`,
						default: false,
						type: "boolean",
					},
					isHidePlutoniumSheetMenuButton: {
						name: "Hide Sheet Menu Button",
						help: `Hide the Plutonium sheet menu button.`,
						default: false,
						type: "boolean",
					},
					isNameTabFromScene: {
						name: "Prepend Active Scene Name to Browser Tab Name",
						help: "Sets the browser tab name to be that of the currently-active scene.",
						default: true,
						type: "boolean",
					},
					tabNameSuffix: {
						name: "Tab Name Suffix",
						help: `Requires the "Name Browser Tab After Active Scene" option to be enabled. A custom name suffix to append to the scene name displayed in the tab (separated by a Foundry-style bullet character).`,
						default: null,
						isNullable: true,
						type: "string",
					},
					isDisplayBackendStatus: {
						name: "Display Detected Backend",
						help: `Adds a cool green hacker tint to the Foundry "anvil" logo in the top-left corner of the screen if Plutonium's backend is detected.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isExpandActiveEffectConfig: {
						name: "Enhance Active Effect Config UI",
						help: `Adds a list of potential active effect attribute keys to the Configure Active Effect window's "Effects" tab, and a field for configuring priority.`,
						default: true,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_DAE]: false,
						},
					},
					isAddDeleteToSceneNavOptions: {
						name: `Add "Delete" to Navbar Scene Context Menu`,
						help: `Adds a "Delete" option to the context menu found when right-clicking a scene in the navigation bar. Note that this does not include the currently-active scene.`,
						default: true,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					isHideGmOnlyConfig: {
						name: "Hide GM-Only Config",
						help: `If enabled, a player viewing the config will see only the limited subset of settings they are allowed to modify. If disabled, a player viewing the config will see all settings, regardless of whether or not they can modify those settings.`,
						default: true,
						type: "boolean",
					},
					isDisableLargeImportWarning: {
						name: "Disable Large Import Warning",
						help: `Disable the warning confirmation dialogue shown when importing a large number of entities.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
				settingsHacks: {
					isFastAnimations: {
						name: "Fast Animations",
						help: "Increase the speed of various UI animations.",
																																				default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isFastTooltips: {
						name: "Fast Tooltips",
						help: "Increase the speed of tooltip animations, and reduce the delay before tooltips appear.",
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isEnableCustomTooltips: {
						name: "Enable Custom Tooltips",
						help: `If disabled, tooltips are not rendered for Plutonium-specific UUIDs. If enabled, a custom tooltip will be presented instead.`,
						default: true,
						type: "boolean",
					},
					isFixEscapeKey: {
						name: "Fix ESC Key",
						help: `Bind the "Escape" key to (in this order): de-select active input fields; de-select selected canvas elements; close context menus; close individual windows in most-recently-active-first order; toggle the main menu.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isFixDrawingFreehandMinDistance: {
						name: "Fix Freehand Drawing Minimum Distance",
						help: `Reduce the minimum mouse movement distance required to start a freehand drawing.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isEnableIncreasedFolderDepth: {
						name: "Render >3 Levels of Folder Nesting",
						help: `If enabled, Foundry's default folder nesting limit (of 3) will be bypassed, for the purpose of rendering directories. Note that this does not necessarily allow you to create additionally-nested folders without using the game API.`,
						default: true,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_BETTER_ROLLTABLES]: false,
						},
					},
					isEnableFolderNameWrap: {
						name: "Wrap Long Folder Names",
						help: `Wrap long folder names over multiple lines, instead of clipping the name.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isEnableSubPopouts: {
						name: "Allow Popout Chaining",
						help: `Automatically pop out apps opened from within popped-out apps. If disabled, apps opened from within popped-out apps will appear in the main window, instead.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isSuppressMissingRollDataNotifications: {
						name: `Suppress &quot;Missing Roll Data&quot; Notifications`,
						help: `If enabled, notification warning  messages of the form "The attribute <X> was not present in the provided roll data." will be suppressed, and logged as console warnings instead.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isAlwaysResizableApps: {
						name: "Default Resizeable Applications",
						help: `If enabled, applications will be resizeable by default. Note that specific applications may still override this.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
			},
			tokens: {
				name: "Tokens",
				settings: {
					isDisplayDamageDealt: {
						name: "Display Missing Health",
						help: `This allows players to see "damage dealt" to a token, without revealing the token's total health. If enabled, each token's missing health is displayed as a number in the bottom-right corner of the token.`,
						default: false,
						type: "boolean",
					},
					damageDealtBloodiedThreshold: {
						name: `Display Missing Health &quot;Wounded&quot; Threshold`,
						help: `The health-loss threshold at which the Missing Health text turns red.`,
						default: 0.5,
						type: "percentage",
						min: 0.0,
						max: 1.0,
					},
					isDamageDealtBelowToken: {
						name: `Missing Health Below Token`,
						help: `If the Missing Health text should be displayed beneath a token, rather than as an overlay.`,
						default: false,
						type: "boolean",
					},
					nameplateFontSizeMultiplier: {
						name: "Font Size Multiplier",
						help: `A multiplier which is applied to token nameplate/tooltip font size, e.g. a value of "0.5" will decrease token nameplate/tooltip font size by half.`,
						default: null,
						type: "number",
						placeholder: "(Use default)",
						min: 0.1,
						max: 10,
						isNullable: true,
					},
					isAllowNameplateFontWrap: {
						name: "Allow Text Wrap",
						help: `If enabled, token nameplate/tooltip text will wrap.`,
						default: ConfigConsts.C_USE_GAME_DEFAULT,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_USE_GAME_DEFAULT,
								name: "Use Foundry default",
							},
							{
								value: false,
								name: "Disabled",
							},
							{
								value: true,
								name: "Enabled",
							},
						],
					},
					nameplateFontWrapWidthMultiplier: {
						name: "Text Wrap Max Width Multiplier",
						help: `A multiplier which is applied to token nameplate/tooltip text wrapping maximum size, e.g. a value of "0.5" will force token nameplates/tooltips to wrap at half their usual length. The base value to which this multiplier is applied is: "2.5 × token width".`,
						default: null,
						type: "number",
						placeholder: "(Use default)",
						min: 0.1,
						max: 10,
						isNullable: true,
					},
					isNameplateOnToken: {
						name: `Move Token Name Onto Token`,
						help: `If a token's name should be displayed on the token, rather than below it.`,
						default: false,
						type: "boolean",
					},
					npcHpRollMode: {
						name: "NPC HP Roll Mode",
						help: `Determines whether or not token HP, for NPC tokens which are not linked to their actor's data, should be rolled upon token creation. If a mode other than "None" is selected, and the token has a valid HP dice formula, the token will roll for HP. For example, a Goblin (7 HP; formula is 2d6) could be created with anywhere between 2 and 12 HP (inclusive).`,
						default: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_NONE,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_NONE,
								name: `None`,
								help: `Do not roll NPC token health.`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_STANDARD,
								name: `Standard Roll`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_GM,
								name: `GM Roll`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_BLIND,
								name: `Blind Roll`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_SELF,
								name: `Self Roll`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_HIDDEN,
								name: `Hidden Roll`,
								help: `Roll NPC token health, but do not post the result to chat.`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_MIN,
								name: `Minimum Value`,
								help: `Use the minimum possible roll value.`,
							},
							{
								value: ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_MAX,
								name: `Maximum Value`,
								help: `Use the maximum possible roll value.`,
							},
						],
					},
					isDisableAnimations: {
						name: "Disable Animations",
						help: "Disable token animations.",
						default: false,
						type: "boolean",
					},
					animationSpeedMultiplier: {
						name: "Animation Speed",
						help: "Multiplies token animation movement speed by the factor provided.",
						default: null,
						type: "number",
						isNullable: true,
						min: 0.1,
						max: 10,
					},
				},
				settingsAdvanced: {
					missingHealthAttribute: {
						name: "Health Attribute",
						help: `The sheet attribute used to fetch current/max health when the "Display Missing Health" option is enabled.`,
						default: "attributes.hp",
						type: "string",
						additionalStyleClasses: "code",
					},
				},
				settingsHacks: {
					isIgnoreDisableAnimationsForWaypointMovement: {
						name: "Avoid Disabling Animations for Ruler Movement",
						help: `Suppresses the "Disable Animations" option for a token being moved via ruler waypoints (i.e. when CTRL-dragging from a token and pressing SPACE). Note that dismissing the ruler during the move will end this suppression.`,
						default: true,
						type: "boolean",
					},
				},
			},
			import: {
				name: "Import",
				settings: {
					isAddSourceToName: {
						name: "Add Source to Names",
						help: `If the source of each imported entry (e.g. "MM" for Monster Manual) should be appended to the name of the entry.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isRenderLinksAsTags: {
						name: `Render Links as &quot;@tag&quot;s`,
						help: `If links found in description text should be rendered as Plutonium-specific @tag syntax, e.g. a link to "goblin" would be rendered as "@creature[goblin|mm]". (By default, a link to the 5etools page will be rendered instead.)`,
						default: true,
						type: "boolean",
					},
					isRendererLinksDisabled: {
						name: "Disable 5etools Links",
						help: `Prevents links to other 5etools content from being added to the text of imported 5etools content.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isRendererDiceDisabled: {
						name: "Render Dice as Plain Text",
						help: `Forces dice expressions, usually rendered as "[[/r XdY + Z ...]]", to be rendered as plain text when importing 5etools content.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					enrichersAutoConvert: {
						name: "Use Enrichers",
						help: `If enabled, importers will make use of dnd5e-specific custom enrichers when rendering content. For example, damage rolls may be rendered as "[[/damage ...]]" instead of "[[/r ...]]", changing the on-click behaviour.`,
						default: {
														[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__CONDITION]: true,
							[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DICE]: true,
							[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__RULE]: true,
							[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__SENSE]: true,
							[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__SKILL]: true,
							[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DC]: true,
						},
						type: "multipleChoice",
						choices: [
														{value: ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__CONDITION, name: "Condition (Reference)"},
							{value: ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DICE, name: "Dice (Damage)"},
							{value: ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__RULE, name: "Rule (Reference)"},
							{value: ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__SENSE, name: "Sense (Reference)"},
							{value: ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__SKILL, name: "Skill (Reference)"},
							{value: ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DC, name: "Save DC (Save)"},
						],
					},
					deduplicationMode: {
						name: "Duplicate Handling Mode",
						help: `Determines what action is taken when importing duplicate content to a directory or compendium. An entity is considered a duplicate if and only if its name and source match an existing entity. Note that this does not function when importing to actor sheets.`,
						default: ConfigConsts.C_IMPORT_DEDUPE_MODE_NONE,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_IMPORT_DEDUPE_MODE_NONE,
								name: `None`,
								help: `No deduplication is done.`,
							},
							{
								value: ConfigConsts.C_IMPORT_DEDUPE_MODE_SKIP,
								name: `Skip duplicates`,
								help: `If a duplicate is found for a would-be imported entity, that entity is not imported.`,
							},
							{
								value: ConfigConsts.C_IMPORT_DEDUPE_MODE_OVERWRITE,
								name: `Update existing`,
								help: `If a duplicate is found for a would-be import entity, the existing entity is updated.`,
							},
						],
					},
					isDuplicateHandlingMaintainImage: {
						name: "Maintain Images when Overwriting Duplicates",
						help: `If enabled, sheet and token images will be maintained when overwriting an existing document in "Update Existing" Duplicate Handling Mode.`,
						default: false,
						type: "boolean",
					},
					minimumRole: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Import",
						help: `"Import" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
					}),
					dragDropMode: {
						name: "Use Importer when Drag-Dropping Items to Actors",
						help: `Some Foundry items (backgrounds, races, spells, items, etc.), when imported via Plutonium and later drag-dropped to an actor sheet, have special handling allowing for greater functionality (such as populating skills and features). This allows you to control whether or not that special handling is used, rather than the baseline Foundry drag-drop. Note that if you modify an item, the changes will not be reflected in the version imported to the sheet by Plutonium.`,
						default: ConfigConsts.C_IMPORT_DRAG_DROP_MODE_PROMPT,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_IMPORT_DRAG_DROP_MODE_NEVER,
								name: `Never`,
							},
							{
								value: ConfigConsts.C_IMPORT_DRAG_DROP_MODE_PROMPT,
								name: `Prompt`,
							},
							{
								value: ConfigConsts.C_IMPORT_DRAG_DROP_MODE_ALWAYS,
								name: `Always`,
							},
						],
						isPlayerEditable: true,
					},
					isUseOtherFormulaFieldForSaveHalvesDamage: {
						name: `Treat &quot;Save Halves&quot; Additional Attack Damage as &quot;Other Formula&quot;`,
						help: `This moves extra attack damage rolls (for example, the poison damage done by a Giant Spider's bite) to the "Other Formula" dice field, which can improve compatibility with some modules.`,
						default: false,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION]: true,
						},
					},
					isUseOtherFormulaFieldForOtherDamage: {
						name: `Treat &quot;Alternate&quot; Attack Damage as &quot;Other Formula&quot;`,
						help: `This moves alternate non-versatile attack damage rolls (for example, Egg Hunter Hatchling's &quot;Egg Tooth&quot; damage when targeting an object) to the "Other Formula" dice field, which can improve compatibility with some modules.`,
						default: false,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION]: true,
						},
					},
					isGlobalMetricDistance: {
						name: "Prefer Metric Distance/Speed (Where Available)",
						help: `If enabled, metric distance/speed units will be preferred, where the importer supports them. Enabling this option effectively overrides all other metric distance/speed options, causing the importer to treat each as though it was enabled.`,
						default: false,
						type: "boolean",
					},
					isGlobalMetricWeight: {
						name: "Prefer Metric Weight (Where Available)",
						help: `If enabled, metric weight units will be preferred, where the importer supports them. Enabling this option effectively overrides all other metric weight options, causing the importer to treat each as though it was enabled.`,
						default: false,
						type: "boolean",
					},
					isShowVariantsInLists: {
						name: "Show Variants/Versions",
						help: `If variants/versions of base entries should be shown in list views (with grayed-out names).`,
						default: true,
						type: "boolean",
					},
					isSaveImagesToServer: {
						name: "Save Imported Images to Server",
						help: `If images referenced in imported content should be saved to your server files, rather than referenced from an external server.`,
						default: false,
						type: "boolean",
					},
					isSaveTokensToServer: {
						name: "Save Imported Tokens to Server",
						help: `If tokens for imported actors should be saved to your server files, rather than referenced from an external server.`,
						default: true,
						type: "boolean",
					},
					localImageDirectoryPath: {
						name: "Image/Token Directory",
						help: `The sub-directory of the "User Data" directory where imported images/tokens will be saved to when using the "Save Imported Images to Server" option or the "Save Imported Tokens to Server" option. If the "Use Local Images" option is enabled, images will be loaded from this directory by default.`,
						default: `assets/${SharedConsts.MODULE_ID_FAKE}`,
						type: "string",
						additionalStyleClasses: "code",
					},
					isPreferFoundryImages: {
						name: "Prefer Foundry/System Images",
						help: `If enabled, portraits for actors and images for items will be sourced from built-in compendiums first, then Plutonium second. If disabled, portraits/images will be sourced from Plutonium first, then built-in compendiums second.`,
						default: false,
						type: "boolean",
					},
					isPreferFoundryTokens: {
						name: "Prefer Foundry/System Tokens",
						help: `If enabled, tokens will be sourced from built-in compendiums first, then Plutonium second. If disabled, tokens will be sourced from Plutonium first, then built-in compendiums second.`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getImporterToggles(),
					isTreatJournalEntriesAsFolders: {
						name: "Treat Journal Entries as Folders",
						help: `If enabled, Journal Entries are treated as an additional folder level for the purpose of organising imports, etc.`,
						default: true,
						type: "boolean",
						isReloadRequired: true,
					},
					isUseLocalImages: {
						name: "Use Local Images",
						help: `If enabled, images will be sourced from the "Image/Token Directory" directory, defined above.`,
						default: false,
						type: "boolean",
					},
					isStrictMatching: {
						name: "Use Strict Entity Matching",
						help: `If enabled, any Plutonium feature which searches for existing data (for example, the class importer attempting to find existing class levels in a given class) will match by name and source. If disabled, only name is used.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					summonsFolderName: {
						name: "Summons Folder Name",
						help: `When summoning a creature from a "Summon"-type spell, the importer will attempt to create and store the imported creature in this folder.`,
						type: "string",
						default: "Summons",
					},
					tempFolderName: {
						name: "Temp Folder Name",
						help: `The name of a temporary folder created/deleted by some operations. Note that the importer will delete this folder regardless of its contents, as anything contained within it is assumed to be a temporary entity created by the importer.`,
						type: "string",
						default: "Temp",
					},
					isUseAdvancementBackingCompendium: {
						name: "Use Advancement-Backing Compendium",
						help: `If enabled, imported features with advancement links will be copied to, and referenced from, a compendium.`,
						default: false,
						type: "boolean",
					},
					isAutoAddAdditionalFonts: {
						name: "Automatically Add Extra Fonts",
						help: `If enabled, and you import content which requires additional fonts, these fonts will be added to your game's "Additional Fonts" setting.`,
						default: true,
						type: "boolean",
					},
					weaponTargetDefault: {
						name: "Default Weapon Target",
						help: `Controls the target information used when importing a weapon (as either an item via the Item Importer, or as a creature feature via the Creature or Creature Feature Importers) if no specific target information is available.`,
						default: ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__NONE,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__NONE,
								name: `None`,
							},
							{
								value: ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__CREATURE_OR_OBJECT,
								name: `Creature or Object`,
							},
							{
								value: ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__CREATURE,
								name: `Creature`,
							},
						],
					},
				},
			},
			importCreature: {
				name: "Import (Creatures)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported creature.`),
					isImportBio: {
						name: "Import Fluff to Biography",
						help: `If enabled, any fluff text which is available for a creature will be imported into that creature's biography.`,
						default: true,
						type: "boolean",
					},
					isImportBioImages: {
						name: "Include Fluff Image in Biography",
						help: `If enabled, any fluff image which is available for a creature will be imported into that creature's biography.`,
						default: false,
						type: "boolean",
					},
					isImportBioVariants: {
						name: "Include Variants in Biography",
						help: `If enabled, any inset variant boxes associated with a creature will be imported into that creature's biography.`,
						default: true,
						type: "boolean",
					},
					isImportVariantsAsFeatures: {
						name: "Import Variants as Features",
						help: `If enabled, any inset variant boxes associated with a creature will be imported into that creature's features.`,
						default: false,
						type: "boolean",
					},
					//...ConfigConsts._template_getTokenSettings({actorType: "npc"}),
					//...ConfigConsts._template_getTokenSettingsDynamicRing(),
					itemWeightAndValueSizeScaling: {
						name: "Item Weight & Value Scaling",
						help: `The method by which to scale the weights and values of non-standard-sizes items carried by creatures.`,
						default: ConfigConsts.C_CREATURE_ITEM_SCALING__NONE,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_CREATURE_ITEM_SCALING__NONE,
								name: "No scaling",
							},
							{
								value: ConfigConsts.C_CREATURE_ITEM_SCALING__MULTIPLICATIVE,
								name: `"Barding" scaling (multiplicative)`,
								help: `Based on the rules for calculating the weight and cost of barding, as presented in the Player's Handbook (p. 155).`,
							},
							{
								value: ConfigConsts.C_CREATURE_ITEM_SCALING__EXPONENTIAL,
								name: `"Gurt's Greataxe" scaling (exponential)`,
								help: `Based on the giant-size greateaxe of the same name found in Storm King's Thunder (p. 234).`,
							},
						],
					},
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not creature speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
					spellcastingPrimaryTraitMode: {
						name: "Spellcasting Primary Trait Selection Method",
						help: `The method by which a primary spellcasting trait (i.e., the spellcasting trait used to set spellcasting ability, spell DC, and spell attack bonus) is selected if a creature has multiple spellcasting traits with associated ability scores.`,
						default: ConfigConsts.C_CREATURE_SPELLCASTING_PRIMARY_SELECTOR__HIGHEST_SPELL_COUNT,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_CREATURE_SPELLCASTING_PRIMARY_SELECTOR__HIGHEST_SPELL_COUNT,
								name: "Highest spell count",
								help: `Use whichever spellcasting trait has the most spells listed.`,
							},
							{
								value: ConfigConsts.C_CREATURE_SPELLCASTING_PRIMARY_SELECTOR__HIGHEST_ABILITY_SCORE,
								name: `Highest ability score`,
								help: `Use whichever spellcasting trait has the highest associated ability score. Note that this may prefer innate spellcasting traits over spellcasting class levels.`,
							},
						],
					},
					nameTags: {
						name: "Add Tag Suffixes to Names",
						help: `Add tags to an imported creature's name, to allow easier searching (especially within compendiums).`,
						default: {
							[ConfigConsts.C_CREATURE_NAMETAGS_CR]: false,
							[ConfigConsts.C_CREATURE_NAMETAGS_TYPE]: false,
							[ConfigConsts.C_CREATURE_NAMETAGS_TYPE_WITH_TAGS]: false,
						},
						type: "multipleChoice",
						choices: [
							{value: ConfigConsts.C_CREATURE_NAMETAGS_CR, name: "Add [CR] tag"},
							{value: ConfigConsts.C_CREATURE_NAMETAGS_TYPE, name: "Add [type] tag"},
							{value: ConfigConsts.C_CREATURE_NAMETAGS_TYPE_WITH_TAGS, name: "Add [type (with tags)] tag"},
						],
					},
					isAddSoundEffect: {
						name: "MLD: Add Audio as Sound Effect",
						help: `If, when the Monk's Little Details module is active, an imported creature should have its sound effect set, where an audio clip is available (for official data, this will usually be an audio clip of the creature's name being pronounced).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the Creature Importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_CREATURES,
							...ConfigConsts._PACK_IDS__PaBTSO_CREATURES,
							...ConfigConsts._PACK_IDS__TCE_CREATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Actor",
					},
					additionalDataCompendiumFeatures: {
						name: "Additional Data Compendiums (Features)",
						help: `A list of compendiums that the Creature Importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_CREATURE_FEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					isUseTokenImageAsPortrait: {
						name: "Use Token Image as Portrait",
						help: `If enabled, a creature's token image will be preferred over its portrait image when populating its sheet portrait during import.`,
						default: false,
						type: "boolean",
					},
					...ConfigConsts._template_getActorImportOverwriteSettings(),
					isAddFakeClassToCharacter: {
						name: "Add Class to Creatures Imported as Player Characters",
						help: `If enabled, when importing a creature as a Player Character ("character"-type actor) a class item will be added to the actor's sheet, in order to set proficiency bonus and spellcasting levels.`,
						default: true,
						type: "boolean",
					},
					isUseStaticAc: {
						name: "Use Static AC Values",
						help: `If enabled, creature AC will be imported as a static number (rather than relying on the sheet's formula calculation), and creature armor will be imported as unequipped.`,
						default: false,
						type: "boolean",
					},
					isUseCustomNaturalAc: {
						name: "Use Custom Natural Armor Formula",
						help: `If enabled, creatures with natural armor will have their armor formula broken down as "@attributes.ac.armor + @attributes.ac.dex + <naturalBonus>", allowing any later Dexterity score changes to be reflected in the creatures AC.`,
						default: false,
						type: "boolean",
					},
				},
				settingsHacks: {
					isUsePathfinderTokenPackBestiariesImages: {
						name: "Use &quot;Pathfinder Token Pack: Bestiaries&quot; Tokens/Portraits",
						help: `If enabled, and the "Pathfinder Token Pack: Bestiaries" module is installed and enabled, the importer will attempt to use token and portrait art from the "Pathfinder Token Pack: Bestiaries" module.`,
						default: false,
						type: "boolean",
					},
				},
			},
			importCreatureFeature: {
				name: "Import (Creature Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported creature feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "creature features"}),
					isSecretWrapAttacks: {
						name: `&quot;Secret&quot; Attack Descriptions`,
						help: `If enabled, creature attack descriptions will be wrapped in "Secret" blocks, which are not shown when rolling.`,
						default: false,
						type: "boolean",
					},
					isScaleToTargetActor: {
						name: `Scale to Target Actor CR`,
						help: `If enabled, creature features imported to existing NPC actors will be automatically scaled (altering to-hit bonuses, damage rolls, DCs, etc.) based on the difference between the original creature's CR and the target actor's CR.`,
						default: true,
						type: "boolean",
					},
					isMetricDistance: {
						name: "Convert Ranges to Metric",
						help: `Whether or not creature feature range units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "creature features"}),
					isSplitMeleeRangedAttack: {
						name: `Split &quot;Melee or Ranged Attack&quot; Actions`,
						help: `If enabled, the importer will create two sheet items per "Melee or Ranged Attack" action, each with the appropriate range set.`,
						default: true,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION]: true,
						},
					},
					isSplitConditionalDamageAttack: {
						name: `Split Conditional Damage Actions`,
						help: `If enabled, the importer will create two sheet items ("Base" and "Full") per "... plus <x> damage if <y>" action, where the "base" item does not include the conditional damage, and the "full" item does include the conditional damage.`,
						default: true,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION]: true,
						},
					},
					isPreferFlatSavingThrows: {
						name: "Prefer Flat Saving Throws",
						help: `If enabled, a saving throw for a sheet item will always have "flat" scaling, with the flat DC value set to match the number in the creature's stat block. If disabled, a sheet item's saving throw scaling may be set as an ability score, provided that doing so produces the same value for the DC as is listed in the creature's stat block.`,
						default: false,
						type: "boolean",
					},
				},
			},
			importVehicle: {
				name: "Import (Vehicles)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported vehicle.`),
					...ConfigConsts._template_getTokenSettings({actorType: "vehicle"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not vehicle speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}; ${ConfigConsts._DISP_METRIC_MILES}).`,
						default: false,
						type: "boolean",
					},
					isImportBio: {
						name: "Import Fluff to Description",
						help: `If enabled, any fluff text which is available for a vehicle will be imported into that vehicle's description.`,
						default: true,
						type: "boolean",
					},
					isImportBioImages: {
						name: "Include Fluff Image in Description",
						help: `If enabled, any fluff image which is available for a vehicle will be imported into that vehicle's description.`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the vehicle importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [],
						type: "pickerMultiCompendium",
						documentType: "Actor",
					},
					isUseTokenImageAsPortrait: {
						name: "Use Token Image as Portrait",
						help: `If enabled, a vehicle's token image will be preferred over its portrait image when populating its sheet portrait during import.`,
						default: false,
						type: "boolean",
					},
					...ConfigConsts._template_getActorImportOverwriteSettings(),
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "vehicles"}),
				},
			},
			importVehicleUpgrade: {
				name: "Import (Vehicle Upgrades)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported vehicle upgrades.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "vehicle upgrades"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not vehicle upgrade speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "vehicle upgrades"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a vehicle upgrade's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importObject: {
				name: "Import (Objects)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported object.`),
					//...ConfigConsts._template_getTokenSettings({actorType: "vehicle"}),
					//...ConfigConsts._template_getTokenSettingsDynamicRing(),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not object speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
					isImportBio: {
						name: "Import Fluff to Description",
						help: `If enabled, any fluff text which is available for an object will be imported into that object's description.`,
						default: true,
						type: "boolean",
					},
					isImportBioImages: {
						name: "Include Fluff Image in Description",
						help: `If enabled, any fluff image which is available for an object will be imported into that object's description.`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					isUseTokenImageAsPortrait: {
						name: "Use Token Image as Portrait",
						help: `If enabled, an object's token image will be preferred over its portrait image when populating its sheet portrait during import.`,
						default: false,
						type: "boolean",
					},
					...ConfigConsts._template_getActorImportOverwriteSettings(),
				},
			},
			importObjectFeature: {
				name: "Import (Object Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported object feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "object features"}),
					isMetricDistance: {
						name: "Convert Ranges to Metric",
						help: `Whether or not object feature range units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "object features"}),
				},
			},
			importFeat: {
				name: "Import (Feats)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported feat.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "feats"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not feat speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the feat importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__TCE_FEATS,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "feats"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a feat's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importBackground: {
				name: "Import (Backgrounds)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported background.`),
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums (Backgrounds)",
						help: `A list of compendiums that the background importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_BACKGROUNDS_AND_BACKGROUND_FEATURES,
							...ConfigConsts._PACK_IDS__PaBTSO_BACKGROUNDS_AND_BACKGROUND_FEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					additionalDataCompendiumFeatures: {
						name: "Additional Data Compendiums (Features)",
						help: `A list of compendiums that the background importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_BACKGROUNDS_AND_BACKGROUND_FEATURES,
							...ConfigConsts._PACK_IDS__PaBTSO_BACKGROUNDS_AND_BACKGROUND_FEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "backgrounds"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a background's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importBackgroundFeature: {
				name: "Import (Background Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported background feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "background features"}),
				},
			},
			importClass: {
				name: "Import (Classes & Subclasses)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported class or subclass.`),
					isAddUnarmedStrike: {
						name: "Add Unarmed Strike",
						help: `If enabled, importing a class to an actor will create an "Unarmed Strike" weapon, unless one already exists.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isImportClassTable: {
						name: "Import Class Table to Description",
						help: `If enabled, a class's table will be imported as part of the class item's description.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isImportDescriptionFluffText: {
						name: "Import Fluff Text to Description",
						help: `If enabled, a class/subclass's fluff text will be imported as part of the class/subclass item's description.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isImportDescriptionFluffImages: {
						name: "Import Fluff Images to Description",
						help: `If enabled, a class/subclass's fluff image will be imported as part of the class/subclass item's description.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isAddLevelUpButton: {
						name: `Add &quot;Level Up&quot; Button to Character Sheets`,
						help: `If enabled, a "Level Up" button will be displayed in the top-right corner of a character's sheet (assuming the default dnd5e sheet is used).`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isSetXp: {
						name: "Set Minimum Actor XP on Class Import",
						help: `If enabled, during class import, actor XP will be set to the minimum XP value required for the actor's new level, if the actor's current XP is insufficient for them to reach their new level.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					hpIncreaseMode: {
						name: "Hit Points Increase Mode",
						help: `Determines how Hit Points are calculated when using the Class Importer to level up. If left unspecified, a user will be prompted to choose the mode each time their Hit Points are increased by the Class Importer.`,
						type: "enum",
						values: [
							{value: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE, name: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE]},
							{value: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN, name: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN]},
							{value: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MAX, name: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MAX]},
							{value: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL, name: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL]},
							{value: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM, name: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM]},
							{value: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE, name: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE]},
						],
						default: null,
						isNullable: true,
					},
					hpIncreaseModeCustomRollFormula: {
						name: "Hit Points Increase Custom Roll Formula",
						help: `A custom roll formula to be used when gaining HP on level up. Used if either the "Hit Points Increase Mode" option is set to "${ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM]}", or if a player chooses "${ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM]}" when prompted to select their Hit Points Increase Mode. Use "@hd.faces" for the type of dice (i.e., the "8" in "1d8"), and "@hd.number" for "number of dice" (i.e., the "1" in "1d8"). Note that backticks (\`) around an expression will also be replaced so "\`@hd.number\`d\`@hd.faces\`" will produce e.g. "1d8", should you need to avoid using brackets.`,
						placeholder: "(@hd.number)d(@hd.faces)",
						type: "string",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
					},
					isUseBaldursGateIcons: {
						name: "Use Baldur's Gate 3 Icons",
						help: `If enabled, class and subclass icons from the 2023 game "Baldur's Gate 3" will be used, where available.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
				settingsAdvanced: {
					isDisplayOnLevelZeroCharacters: {
						name: `Display &quot;Level Up&quot; Button on New Characters`,
						help: `If enabled, the "Level Up" button will be displayed on character actors with no levels.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isLevelUpButtonDisabledUntilEnoughExperience: {
						name: `Disable the &quot;Level Up&quot; Button Until Character Has Enough XP`,
						help: `If enabled, the "Level Up" button will be disabled (though still visible) on characters who do not have sufficient XP to level up.`,
						default: true,
						type: "boolean",
					},
					additionalDataCompendiumClasses: {
						name: "Additional Data Compendiums (Classes)",
						help: `A list of compendiums that the class importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_CLASSES,
							...ConfigConsts._PACK_IDS__TCE_CLASSES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					additionalDataCompendiumSubclasses: {
						name: "Additional Data Compendiums (Subclasses)",
						help: `A list of compendiums that the class importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_SUBCLASSES,
							...ConfigConsts._PACK_IDS__TCE_SUBCLASSES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					additionalDataCompendiumFeatures: {
						name: "Additional Data Compendiums (Features)",
						help: `A list of compendiums that the class importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_CLASS_FEATURES,
							...ConfigConsts._PACK_IDS__TCE_CLASS_FEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "class"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a class's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
					isUseDefaultSubclassImage: {
						name: "Subclass Default Image Fallback",
						help: `If enabled, when importing a subclass which has no well-defined image, use a default image based on class. If disabled, a generic black and white image will be used as a fallback instead.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isHideSubclassRows: {
						name: "Hide Subclasses in Class Importer",
						help: `If enabled, the class/subclass list in the Class Importer will only show classes.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
			},
			importClassSubclassFeature: {
				name: "Import (Class & Sub. Features)",
				help: "Import (Class & Subclass Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported class/subclass feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "class/subclass features"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not class/subclass feature speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "class features"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a class/subclass feature's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
					deduplicateRefSelectionMode: {
						name: "Deduplicate Nested Feature Selection",
						help: `When importing a selected list of class/subclass features, this determines whether the importer should automatically deselect a feature which is nested inside another, already-selected, feature.`,
						default: ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_DEDUPLICATE,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_DEDUPLICATE,
								name: `Deduplicate`,
							},
							{
								value: ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_PROMPT,
								name: `Prompt On Duplicate`,
							},
							{
								value: ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_ALLOW,
								name: `Allow Duplicates`,
							},
						],
						isPlayerEditable: true,
					},
				},
			},
			importItem: {
				name: "Import (Items)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported item.`),
					isAddActiveEffects: {
						name: "Populate Active Effects",
						help: `If items should have active effects created during import.`,
						default: true,
						type: "boolean",
											},
					isMetricDistance: {
						name: "Convert Ranges to Metric",
						help: `Whether or not item range units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
					isMetricWeight: {
						name: "Convert Item Weights to Metric",
						help: `Whether or not item weight units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_POUNDS}).`,
						default: false,
						type: "boolean",
					},
					inventoryStackingMode: {
						name: "Inventory Stacking Mode",
						help: `If imported items should "stack" with existing items when imported to an actor's inventory. If stacking is allowed, the importer will check for an existing item when importing an item to an actor's sheet. If the item already exists, the importer will increase the quantity of that item in the actor's inventory, rather than create a new copy of the item in the actor's inventory.`,
						default: ConfigConsts.C_ITEM_ATTUNEMENT_SMART,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_NEVER,
								name: `Never Stack`,
							},
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_SMART,
								name: `Sometimes Stack (e.g. consumables, throwables)`,
							},
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_ALWAYS,
								name: `Always Stack`,
							},
						],
					},
					isSplitPacksActor: {
						name: "Import Packs to Actors as Constituent Items",
						help: `If "pack" items (explorer's pack, dungeoneer's pack) should be broken down and imported as their constituent items when importing to an actor's items.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isSplitAtomicPacksActor: {
						name: "Import Item Stacks to Actors as Constituent Items",
						help: `If an item which is formed of multiple constituent items of the same type, such as "Bag of Ball Bearings (1,000)", should be split up into its constituent items (a "Ball Bearing" item with its sheet quantity set to 1,000, in this example).`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					throwables: {
						name: "Throwing Items",
						help: `Items which will be stacked when "Inventory Stacking Mode" is set to "Sometimes Stack".`,
						default: ["Handaxe", "Javelin", "Light Hammer", "Dart", "Net"],
						type: "arrayStringShort",
						isPlayerEditable: true,
					},
					altAbilityScoreByClass: {
						name: "Alt Ability Scores by Class",
						help: `A list of <class>-<item>-<score> mappings, an entry in which, when importing an item, will change the default ability score used by an item for a member of that class.`,
						default: [
							"monk:club:dex",
							"monk:dagger:dex",
							"monk:handaxe:dex",
							"monk:javelin:dex",
							"monk:light hammer:dex",
							"monk:mace:dex",
							"monk:quarterstaff:dex",
							"monk:shortsword:dex",
							"monk:sickle:dex",
							"monk:spear:dex",
						],
						type: "arrayStringShort",
						isPlayerEditable: true,
					},

					identified: {
						name: "Identify when Importing",
						help: `Whether or not an item should be marked as "Identified" when imported.`,
						default: {
							"mundane": true,
							"magic": false,
							"mundaneActor": true,
							"magicActor": true,
						},
						type: "multipleChoice",
						choices: [
							{name: "Directory/Compendium (Mundane)", value: "mundane"},
							{name: "Directory/Compendium (Magic)", value: "magic"},
							{name: "Actors (Mundane)", value: "mundaneActor"},
							{name: "Actors (Magic)", value: "magicActor"},
						],
					},
					attunementType: {
						name: "Attunement when Importing to Directory/Compendium",
						help: `The attunement type to use when importing an item which can be attuned.`,
						default: ConfigConsts.C_ITEM_ATTUNEMENT_REQUIRED,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_NONE,
								name: `None`,
							},
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_REQUIRED,
								name: `Attunement required`,
							},
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_ATTUNED,
								name: `Attuned`,
							},
						],
					},
					attunementTypeActor: {
						name: "Attunement when Importing to Actors",
						help: `The attunement type to use when importing an item which can be attuned.`,
						default: ConfigConsts.C_ITEM_ATTUNEMENT_ATTUNED,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_NONE,
								name: `None`,
							},
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_REQUIRED,
								name: `Attunement required`,
							},
							{
								value: ConfigConsts.C_ITEM_ATTUNEMENT_ATTUNED,
								name: `Attuned`,
							},
						],
					},
					isImportDescriptionHeader: {
						name: "Include Damage, Properties, Rarity, and Attunement in Description",
						help: `If enabled, an imported item's description will include text generated from its rarity, attunement requirements, damage, and other properties.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isUseOtherFormulaFieldForExtraDamage: {
						name: `Treat Extra Damage as &quot;Other Formula&quot;`,
						help: `This moves extra damage rolls to the "Other Formula" dice field, which can improve compatibility with some modules.`,
						default: false,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION]: true,
						},
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the Item Importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_ITEMS,
							...ConfigConsts._PACK_IDS__PaBTSO_ITEMS,
							...ConfigConsts._PACK_IDS__TCE_ITEMS,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					replacementDataCompendium: {
						name: "Replacement Data Compendiums",
						help: `A list of compendiums that the Item Importer will attempt to pull items from, rather than using the data Plutonium would otherwise generate. This is useful when the Item Importer is used by other importers, e.g. when the Creature Importer is adding items to newly-created actors.`,
						default: [],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "items"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, an item's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importPsionic: {
				name: "Import (Psionics)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported psionic.`),
					psiPointsResource: {
						name: "Psi Points Resource",
						help: `The resource consumed by psionics.`,
						default: ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM,
								name: `"Psi Points" sheet item`,
							},
							{
								value: ConfigConsts.C_SPELL_POINTS_RESOURCE__ATTRIBUTE_CUSTOM,
								name: `Custom/Legacy (see below)`,
							},
						],
						isPlayerEditable: true,
					},
					psiPointsResourceCustom: {
						name: "Psi Points Custom/Legacy Resource",
						help: `The name of the custom/legacy resource to use if "Custom/Legacy" is selected for "Psi Points Resource", above. This supports legacy resources ("resources.primary", ...), as well as modules that expand the number of available sheet resources, such as "5e-Sheet Resources Plus" (which adds e.g. "resources.fourth", "resources.fifth", ...).`,
						type: "string",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
						isPlayerEditable: true,
					},
					isImportAsSpell: {
						name: "Import as Spells",
						help: `If enabled, psionics will be imported as spells, rather than features.`,
						default: false,
						type: "boolean",
					},
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "psionics"}),
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "psionic"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a psionic's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importRace: {
				name: "Import (Races)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported race.`),
					...ConfigConsts._template_getTokenSettings({actorType: "character"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not race speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the race importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_RACES_AND_RACE_FEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "races"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a race's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importRaceFeature: {
				name: "Import (Race Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported race feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "race features"}),
				},
				settingsAdvanced: {
					additionalDataCompendiumFeatures: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the race feature importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_RACES_AND_RACE_FEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "race features"}),
				},
			},
			importTable: {
				name: "Import (Table)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported table.`),
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the Table Importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_TABLES,
						],
						type: "pickerMultiCompendium",
						documentType: "RollTable",
					},
				},
			},
			importSpell: {
				name: "Import (Spells)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported spell.`),
					prepareActorSpells: {
						name: "Prepare Actor Spells",
						help: "Whether or not spells that are imported to actor sheets should be prepared by default.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					prepareSpellItems: {
						name: "Prepare Spell Items",
						help: "Whether or not spells that are imported to the items directory should be prepared by default.",
						default: false,
						type: "boolean",
					},
					actorSpellPreparationMode: {
						name: "Actor Spell Preparation Mode",
						help: `The default spell preparation mode for spells imported to actor sheets.`,
						default: "prepared",
						type: "enum",
						values: [
							{
								value: "",
								name: "(None)",
							},
							{
								value: "always",
								name: "Always Prepared",
							},
							{
								value: "prepared",
								name: "Prepared",
							},
							{
								value: "innate",
								name: "Innate Spellcasting",
							},
							{
								value: "pact",
								name: "Pact Magic",
							},
						],
						isPlayerEditable: true,
					},
					isAutoDetectActorSpellPreparationMode: {
						name: "Auto-Detect Actor Spell Preparation Mode",
						help: `If enabled, the default spell preparation mode for spells imported to actor sheets (as defined by "Actor Spell Preparation Mode") may be automatically overridden, e.g. "pact magic" is automatically used when importing to a warlock.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					spellItemPreparationMode: {
						name: "Spell Item Preparation Mode",
						help: `The default spell preparation mode for spells imported to the items directory.`,
						default: "prepared",
						type: "enum",
						values: [
							{
								value: "",
								name: "(None)",
							},
							{
								value: "always",
								name: "Always Prepared",
							},
							{
								value: "prepared",
								name: "Prepared",
							},
							{
								value: "innate",
								name: "Innate Spellcasting",
							},
							{
								value: "pact",
								name: "Pact Magic",
							},
						],
					},
					spellScrollPriceMode: {
						name: "Spell Scroll Price Mode",
						help: `When importing a spell as a spell scroll, this is used to determine the price of the resulting item. Note the default is that of the dnd5e system.`,
						default: ConfigConsts.C_SPELL_SCROLL_PRICE_MODE__SMIP,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_SPELL_SCROLL_PRICE_MODE__SMIP,
								name: "Default (Sane Magic Item Prices homebrew)",
							},
							{
								value: ConfigConsts.C_SPELL_SCROLL_PRICE_MODE__NO_PRICE,
								name: "No Price",
							},
							{
								value: ConfigConsts.C_SPELL_SCROLL_PRICE_MODE__XGE_SHARED_CAMPAIGN,
								name: "Shared Campaign Variant Rules (XGE)",
							},
							{
								value: ConfigConsts.C_SPELL_SCROLL_PRICE_MODE__XGE_DOWNTIME_SCRIBING,
								name: "Downtime Activity: Scribing a Spell Scroll (XGE)",
							},
							{
								value: ConfigConsts.C_SPELL_SCROLL_PRICE_MODE__CUSTOM,
								name: "Custom (see below)",
							},
						],
					},
					spellScrollPricesCustom: {
						name: "Spell Scroll Custom Prices",
						help: `A comma-separated list of prices, in gold pieces, for each spell scroll level.`,
						type: "string",
						additionalStyleClasses: "code",
						default: [...new Array(10)].map(() => "0").join(","),
					},
					isAddSummonsProfiles: {
						name: "Populate Summons Profiles",
						help: `If enabled, an imported spell may include "Summons Profiles" where appropriate. Additionally, patches will be applied to allow an imported summon spell to function.`,
						default: true,
						type: "boolean",
						isReloadRequired: true,
					},
					spellPointsMode: {
						name: "Use Spell Points",
						help: `If enabled, imported spells which would use spell slots will instead be marked as "at will" and set to consume an a sheet or feature resource. (The "Spell Points" variant rule can be found in the DMG, page 288.)`,
						default: ConfigConsts.C_SPELL_POINTS_MODE__DISABLED,
						type: "enum",
						values: [
							{
								name: "Disabled",
								value: ConfigConsts.C_SPELL_POINTS_MODE__DISABLED,
							},
							{
								name: "Enabled",
								value: ConfigConsts.C_SPELL_POINTS_MODE__ENABLED,
							},
							{
								name: "Enabled, and Use 99 Slots",
								value: ConfigConsts.C_SPELL_POINTS_MODE__ENABLED_AND_UNLIMITED_SLOTS,
								help: `If enabled, an imported spells will retain its "Spell Preparation Mode" in addition to consuming a "Spell Points" sheet/feature resource. This improves compatibility with many sheets and modules. To allow "unlimited" spellcasting at each spell level, a character's spell slots for each level will be set to 99.`,
							},
						],
						isPlayerEditable: true,
					},
					spellPointsResource: {
						name: "Spell Points Resource",
						help: `The resource consumed by spells imported with "Use Spell Points" enabled.`,
						default: ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM,
								name: `"Spell Points" sheet item`,
							},
							{
								value: ConfigConsts.C_SPELL_POINTS_RESOURCE__ATTRIBUTE_CUSTOM,
								name: `Custom/Legacy (see below)`,
							},
						],
						isPlayerEditable: true,
					},
					spellPointsResourceCustom: {
						name: "Spell Points Custom/Legacy Resource",
						help: `The name of the custom/legacy resource to use if "Custom/Legacy" is selected for "Spell Points Resource", above. This supports legacy resources ("resources.primary", ...), as well as modules that expand the number of available sheet resources, such as "5e-Sheet Resources Plus" (which adds e.g. "resources.fourth", "resources.fifth", ...).`,
						type: "string",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
						isPlayerEditable: true,
					},
					isIncludeClassesInDescription: {
						name: "Include Caster Classes in Spell Description",
						help: `If enabled, an imported spell's description will include the list of classes which have the spell on their spell list.`,
						default: false,
						type: "boolean",
					},
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "spells"}),
					isMetricDistance: {
						name: "Convert Ranges and Areas to Metric",
						help: `Whether or not spell range/area units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}; ${ConfigConsts._DISP_METRIC_MILES}).`,
						default: false,
						type: "boolean",
					},
					isFilterOnOpen: {
						name: "Apply Class Filter when Opening on Actor",
						help: "If enabled, and the importer is opened from an actor, the spell list will be filtered according to that actor's current class(es).",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the Spell Importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_SPELLS,
							...ConfigConsts._PACK_IDS__TCE_SPELLS,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					replacementDataCompendium: {
						name: "Replacement Data Compendiums",
						help: `A list of compendiums that the Spell Importer will attempt to pull spells from, rather than using the data Plutonium would otherwise generate. This is useful when the Spell Importer is used by other importers, e.g. when the Creature Importer is adding spells to newly-created actors.`,
						default: [],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "spells"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a spell's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
					isUseCustomSrdIcons: {
						name: "Use Custom Icons for SRD Spells",
						help: `If enabled, imported SRD spells will use an alternate icon set, as curated by the community.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isUseDefaultSchoolImage: {
						name: "School Default Image Fallback",
						help: `If enabled, when importing a spell which has no well-defined image, use a default image based on the school of the spell. If disabled, a generic black and white image will be used as a fallback instead.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					spellPointsModeNpc: {
						name: "Use Spell Points (NPCs)",
						help: `If enabled, a spell imported to an NPC which would use spell slots will instead be marked as "at will" and set to consume an a sheet or feature resource. (The "Spell Points" variant rule can be found in the DMG, page 288.)`,
						default: ConfigConsts.C_SPELL_POINTS_MODE__DISABLED,
						type: "enum",
						values: [
							{
								name: "Disabled",
								value: ConfigConsts.C_SPELL_POINTS_MODE__DISABLED,
							},
							{
								name: "Enabled",
								value: ConfigConsts.C_SPELL_POINTS_MODE__ENABLED,
							},
							{
								name: "Enabled, but Use 99 Slots",
								value: ConfigConsts.C_SPELL_POINTS_MODE__ENABLED_AND_UNLIMITED_SLOTS,
								help: `If enabled, imported spells will retain their "prepared"/etc. types in addition to consuming a "Spell Points" sheet/feature resource. This allows easier organisation of spells, and better compatibility with many modules. To allow "unlimited" spellcasting at each spell level, a character's spell slots for each level will be set to 99.`,
							},
						],
					},
				},
			},
			importRule: {
				name: "Import (Rules)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported rule.`),
				},
			},
			importLanguage: {
				name: "Import (Languages)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported language.`),
				},
			},
			importOptionalFeature: {
				name: "Import (Options & Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported option/feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "optional features"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not optional feature speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
					isFilterOnOpen: {
						name: "Apply Level Filter when Opening on Actor",
						help: "If enabled, and the importer is opened from an actor, the list will be filtered according to that actor's current class and level.",
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
				settingsAdvanced: {
					additionalDataCompendium: {
						name: "Additional Data Compendiums",
						help: `A list of compendiums that the optional feature importer will attempt to pull additional data (including art) from rather than use the default Plutonium icons.`,
						default: [
							...ConfigConsts._PACK_IDS__SRD_OPTIONALFEATURES,
							...ConfigConsts._PACK_IDS__TCE_OPTIONALFEATURES,
						],
						type: "pickerMultiCompendium",
						documentType: "Item",
					},
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "optional features"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, an optional feature's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importConditionDisease: {
				name: "Import (Conditions & Diseases)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported condition/diseases.`),
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "conditions/diseases"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a condition/disease's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importCultBoon: {
				name: "Import (Cults & Supernatural Boons)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported cult/boon.`),
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "cults/boons"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a cult/boon's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importAction: {
				name: "Import (Actions)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported action.`),
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "actions"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a action's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importReward: {
				name: "Import (Gifts & Rewards)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported supernatural gift/reward.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "supernatural gift/rewards"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not gift/reward speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "gift/rewards"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a supernatural gift/reward's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importCharCreationOption: {
				name: "Import (Char. Creation Options)",
				help: "Import (Character Creation Options)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported character creation option.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "character creation options"}),
					isMetricDistance: {
						name: "Convert Speeds to Metric",
						help: `Whether or not character creation option speed units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "character creation options"}),
					isImportDescription: {
						name: "Import Text as Description",
						help: `If enabled, a character creation option's text will be imported as item description.`,
						default: true,
						type: "boolean",
					},
				},
			},
			importDeity: {
				name: "Import (Deities)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported deity.`),
				},
			},
			importRecipe: {
				name: "Import (Recipes)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported recipe.`),
				},
			},
			importTrap: {
				name: "Import (Traps)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported trap.`),
					...ConfigConsts._template_getTokenSettings({actorType: "npc"}),
					isImportBio: {
						name: "Import Fluff to Description",
						help: `If enabled, any fluff text which is available for a trap will be imported into that trap's description.`,
						default: true,
						type: "boolean",
					},
					isImportBioImages: {
						name: "Include Fluff Image in Description",
						help: `If enabled, any fluff image which is available for a trap will be imported into that trap's description.`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActorImportOverwriteSettings(),
				},
			},
			importTrapFeature: {
				name: "Import (Trap Features)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported trap feature.`),
					...ConfigConsts._template_getTargetTemplatePrompt({namePlural: "trap features"}),
					isMetricDistance: {
						name: "Convert Ranges to Metric",
						help: `Whether or not trap feature range units should be converted to an approximate metric equivalent (${ConfigConsts._DISP_METRIC_FEET}).`,
						default: false,
						type: "boolean",
					},
				},
				settingsAdvanced: {
					...ConfigConsts._template_getActiveEffectsDisabledTransferSettings({name: "trap features"}),
				},
			},
			importHazard: {
				name: "Import (Hazards)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported hazard.`),
				},
			},
			importAdventure: {
				name: "Import (Adventures)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported adventure.`),
					isUseModdedInstaller: {
						name: "Use Modded Package Installer",
						help: `If the modded Plutonium backend is installed, adventure packages (modules/worlds) will be installed, automatically, using the mod, rather than providing you with a list of links to copy-paste into Foundry's "Setup".`,
						type: "boolean",
						default: false,
					},
					isUseLegacyImporter: {
						name: "Enable Legacy Package Importer",
						help: `If Plutonium should allow adventure packages (modules/worlds) to be imported directly, rather than providing references for the user to investigate themselves.`,
						type: "boolean",
						default: false,
						unlockCode: "unlock",
					},
					indexUrl: {
						name: "Package Index URL",
						help: `The URL of the index file from which world/module package metadata is loaded.`,
						type: "url",
						default: "https://raw.githubusercontent.com/DMsGuild201/Foundry_Resources/master/worlds/index.json",
						additionalStyleClasses: "code",
						isReloadRequired: true,
					},
				},
			},
			importBook: {
				name: "Import (Books)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported book.`),
				},
			},
			importMap: {
				name: "Import (Maps)",
				settings: {
					...ConfigConsts._template_getSceneImportSettings(),
				},
				settingsAdvanced: {
					baseSideDataUrl: {
						name: "Base Scene Repository URL",
						help: `The root GitHub repository URL from which to load additional scene data when importing content. URLs should be of the form "https://raw.githubusercontent.com/[username]/[repository name]/[branch name]".`,
						type: "url",
						additionalStyleClasses: "code",
						default: "https://raw.githubusercontent.com/TheGiddyLimit/plutonium-scenes/main",
					},
					isFetchSideData: {
						name: "Fetch Supplementary Data from Scene Repository",
						help: `If supplementary scene data (walls, etc.) should be fetched from the Scene Repository during import.`,
						type: "boolean",
						default: true,
					},
					isDrawDebugRegionsPreTransform: {
						name: "Draw Pre-Transform Debug Regions",
						help: `During import, draw "mapRegion" areas prior to transformation.`,
						type: "boolean",
						default: false,
						unlockCode: "debug",
					},
					isDrawDebugRegionsPostTransform: {
						name: "Draw Post-Transform Debug Regions",
						help: `During import, draw "mapRegion" areas after transformation.`,
						type: "boolean",
						default: false,
						unlockCode: "debug",
					},
					debugAllowedMapUrlPathList: {
						name: "Map URL/Path List",
						help: `A comma-seperated list of maps, specified by image URL/path, which should be exclusively imported when importing an adventure/book.`,
						type: "string",
						default: null,
						isNullable: true,
						additionalStyleClasses: "code",
						unlockCode: "debug",
					},
				},
			},
			importDeck: {
				name: "Import (Decks)",
				settings: {
					ownership: ConfigConsts._template_getEntityOwnership(`The default (i.e. used for all players unless a player-specific ownership level is set) ownership for an imported deck.`),
				},
			},
			actor: {
				name: "Actors",
				settings: {
					isRefreshOtherOwnedSheets: {
						name: `Refresh Sheets using &quot;@${SharedConsts.MODULE_ID_FAKE}.userchar&quot; when Updating Player Character`,
						help: `Player only. If enabled, when you update your character, the sheets of other actors you control which use "@${SharedConsts.MODULE_ID_FAKE}.userchar. ..." attributes will be automatically refreshed to reflect any changes made to your character. If disabled, you may notice a "lag" between updating your character and seeing the changes reflected in other sheets (a refresh can be forced manually by editing any field on the other sheet, or refreshing your browser tab).`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
				settingsAdvanced: {
					isAddRollDataItemsFeat: {
						name: "Add &quot;@srd5e.items&quot; to Roll Data (Features)",
						help: `If actor roll data should be modified to allow access owned items, via data paths of the form "@srd5e.items.<itemName>. ..." (for example, "@srd5e.items.big-sword.system.attack.bonus" would be substituted with the attack bonus of the owned item "Big Sword").`,
						default: false,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION]: true,
						},
					},
					isAddRollDataItemsItem: {
						name: "Add &quot;@srd5e.items&quot; to Roll Data (Inventory)",
						help: `If actor roll data should be modified to allow access owned items, via data paths of the form "@srd5e.items.<itemName>. ..." (for example, "@srd5e.items.big-sword.system.attack.bonus" would be substituted with the attack bonus of the owned item "Big Sword").`,
						default: false,
						type: "boolean",
					},
					isAddRollDataItemsSpell: {
						name: "Add &quot;@srd5e.items&quot; to Roll Data (Spells)",
						help: `If actor roll data should be modified to allow access owned items, via data paths of the form "@srd5e.items.<itemName>. ..." (for example, "@srd5e.items.big-sword.system.attack.bonus" would be substituted with the attack bonus of the owned item "Big Sword").`,
						default: false,
						type: "boolean",
					},
					isAddRollDataItemsOther: {
						name: "Add &quot;@srd5e.items&quot; to Roll Data (Other)",
						help: `If actor roll data should be modified to allow access owned items, via data paths of the form "@srd5e.items.<itemName>. ..." (for example, "@srd5e.items.big-sword.system.attack.bonus" would be substituted with the attack bonus of the owned item "Big Sword").`,
						default: false,
						type: "boolean",
					},
				},
				settingsHacks: {
					isAutoMultiattack: {
						name: "Auto-Roll Multiattacks",
						help: `Attempt to detect and automatically roll components of a creature's Multiattack sheet item on activation.`,
						default: false,
						type: "boolean",
					},
					autoMultiattackNames: {
						name: "Auto-Roll Multiattack Names",
						help: `If "Auto-Roll Multiattacks" is enabled, an item with a name matching any of these names will be treated as a "Multiattack" item. Note that text in parentheses is ignored, so e.g. "Multiattack" and "Multiattack (Hybrid form only)" are equivalent.`,
						default: ["multiattack"],
						type: "arrayStringShort",
					},
					autoMultiattackDelay: {
						name: "Time Between Multiattack Rolls (ms)",
						help: `A number of milliseconds to wait between each roll of a multiattack when using the "Auto-Roll Multiattacks" option. A value of 2000-2500 is recommended when using the "Automated Animations" module.`,
						default: null,
						type: "number",
						min: 0,
						isNullable: true,
					},
					isUseExtendedActiveEffectsParser: {
						name: "Support Variables in Active Effect Values",
						help: `Allows the use of roll syntax, and notably variables (such as "@abilities.dex.mod"), in active effect values.`,
						default: true,
						type: "boolean",
						compatibilityModeValues: {
							[UtilCompat.MODULE_DAE]: false,
							[UtilCompat.MODULE_ROLLDATA_AWARE_ACTIVE_EFFECTS]: false,
						},
					},
				},
			},
			item: {
				name: "Items",
				settingsHacks: {
					isSuppressAdvancementsOnImportedDrop: {
						name: "Suppress Advancements During Drop Flow",
						help: `If enabled, dropping a Plutonium-imported item to a sheet will briefly disable the default advancement workflow, potentially allowing Plutonium's importer to run instead.`,
						default: true,
						type: "boolean",
					},
				},
			},
			rivet: {
				name: "Rivet",
				settings: {
					targetDocumentId: {
						name: "Target Document",
						help: `The ID of an actor or compendium to which Rivet content should be imported.`,
						default: "",
						type: "string",
						additionalStyleClasses: "code",
						isPlayerEditable: true,
					},
					isDisplayStatus: {
						name: "Display Extension Detected",
						help: `Adds a "paper plane" icon to the Foundry "anvil" logo in the top-left corner of the screen if Rivet is detected.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					minimumRole: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level",
						help: `Rivet will cease to function for any user user with a role less than the chosen role. Directory "Set as Rivet Target" context menu option will also be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
					}),
				},
			},
			artBrowser: {
				name: "Art Browser",
				settings: {
					importImagesAs: {
						name: "Drag-Drop Images As",
						help: `The type of canvas object that should be created when drag-dropping images from the art browser to the canvas.`,
						default: ConfigConsts.C_ART_IMAGE_MODE_TOKEN,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_ART_IMAGE_MODE_TOKEN,
								name: "Tokens",
							},
							{
								value: ConfigConsts.C_ART_IMAGE_MODE_TILE,
								name: "Tiles",
							},
							{
								value: ConfigConsts.C_ART_IMAGE_MODE_NOTE,
								name: "Journal notes",
							},
							{
								value: ConfigConsts.C_ART_IMAGE_MODE_SCENE,
								name: "Scenes",
							},
						],
					},
					dropAnchor: {
						name: "Drag-Drop Position Anchor",
						help: `The origin point of the image used for the purpose of dropping it to the canvas. "Center" will place the center of the image at the drop position, whereas "Top-Left Corner" will place the top-left corner of the image at the drop position.`,
						default: 0,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_ART_DROP_ANCHOR_CENTER,
								name: "Center",
							},
							{
								value: ConfigConsts.C_ART_DROP_ANCHOR_TOP_LEFT,
								name: "Top-Left Corner",
							},
						],
					},
					scale: {
						name: "Tile/Scene Scaling",
						help: `A factor by which to scale placed tiles, and by which to scale scene backgrounds.`,
						default: 1.0,
						type: "number",
						min: 0.01,
						max: 100,
					},
					...ConfigConsts._template_getSceneImportSettings(),
					tokenSize: {
						name: "Token Size",
						help: `The default size of placed tokens.`,
						default: 1,
						type: "enum",
						values: [
							{
								value: 1,
								name: "Medium or smaller",
							},
							{
								value: 2,
								name: "Large",
							},
							{
								value: 3,
								name: "Huge",
							},
							{
								value: 4,
								name: "Gargantuan or larger",
							},
						],
					},
					isSwitchToCreatedScene: {
						name: "Activate Scenes on Creation",
						help: `If enabled, a scene will be activated upon creation (by drag-dropping an image to the canvas).`,
						default: true,
						type: "boolean",
					},
					isDisplaySheetCreatedScene: {
						name: "Display Scene Sheets on Creation",
						help: `If enabled, the "sheet" (i.e., configuration UI) for a scene will be shown upon creation (by drag-dropping an image to the canvas).`,
						default: true,
						type: "boolean",
					},
					artDirectoryPath: {
						name: "User Art Directory",
						help: `The sub-directory of the "User Data" directory where downloaded images and image packs will be saved.`,
						default: "assets/art",
						type: "string",
						additionalStyleClasses: "code",
						isNullable: true,
					},
					buttonDisplay: {
						name: "Add Button To",
						help: `The place(s) where the Art Browser button should be visible.`,
						default: {
							[ConfigConsts.C_ART_IMAGE_MODE_TOKEN]: false,
							[ConfigConsts.C_ART_IMAGE_MODE_TILE]: true,
							[ConfigConsts.C_ART_IMAGE_MODE_NOTE]: false,
							[ConfigConsts.C_ART_IMAGE_MODE_SCENE]: true,
						},
						type: "multipleChoice",
						choices: [
							{value: ConfigConsts.C_ART_IMAGE_MODE_TOKEN, name: "Token scene controls"},
							{value: ConfigConsts.C_ART_IMAGE_MODE_TILE, name: "Tile scene controls"},
							{value: ConfigConsts.C_ART_IMAGE_MODE_NOTE, name: "Note scene controls"},
							{value: ConfigConsts.C_ART_IMAGE_MODE_SCENE, name: "Scene controls"},
						],
					},
					imageSaveMode: {
						name: "Image Saving Mode",
						help: `How images should be saved to the server. If "Default" is selected, an imported image will only be saved if it cannot be referenced via URL. If "Always" is selected, an imported image will be saved to the server, regardless of whether or not it can be referenced via URL. If "Never" is selected, an imported image will only be referenced by URL; if it cannot be referenced via URL, the import will fail. Note that saving images requires the Plutonium backend mod to be installed.`,
						default: ConfigConsts.C_ART_IMAGE_SAVE_MODE__DEFAULT,
						type: "enum",
						values: [
							{
								value: ConfigConsts.C_ART_IMAGE_SAVE_MODE__DEFAULT,
								name: `Default`,
							},
							{
								value: ConfigConsts.C_ART_IMAGE_SAVE_MODE__ALWAYS,
								name: `Always`,
							},
							{
								value: ConfigConsts.C_ART_IMAGE_SAVE_MODE__NEVER,
								name: `Never`,
							},
						],
					},
				},
				settingsAdvanced: {
					isSwitchLayerOnDrop: {
						name: "Switch to Layer on Drop",
						help: `If, when dropping an image into a given layer, the canvas should switch to that layer.`,
						default: true,
						type: "boolean",
					},
					isShowMissingBackendWarning: {
						name: `Show &quot;Missing Backend&quot; Warning`,
						help: `If enabled, and the Plutonium backend mod is not installed, a warning will be shown in the Art Browser.`,
						default: true,
						type: "boolean",
					},
				},
			},
			journalEntries: {
				name: "Journal Entries",
				settings: {
					isAutoExpandJournalEmbeds: {
						name: "Auto-Expand Page Embeds",
						help: `If enabled, journal pages embedded using "@EmbedUUID[JournalEntry. ... JournalEntryPage. ...]{...}" will be expanded by default.`,
						default: true,
						type: "boolean",
					},
					isEnableNoteHeaderAnchor: {
						name: "Allow &quot;Header Anchors&quot; in Notes",
						help: `If enabled, a "Header Anchor" may be specified when creating or editing a map note. When opening a journal entry via a map note with a Header Anchor set, the journal entry will scroll to that header.`,
						default: true,
						type: "boolean",
					},
				},
			},
			tools: {
				name: "Tools",
				settings: {
					isDeduplicateIgnoreType: {
						name: "Ignore Types When Deduplicating",
						help: `If enabled, the Collection Deduplicator will ignore entity types, treating e.g. a PC sheet and an NPC sheet with the same name as a set of duplicates.`,
						default: false,
						type: "boolean",
					},
					minimumRolePolymorph: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Polymorph Tool",
						help: `Actor "Polymorph" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
					}),
					minimumRoleActorTools: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Other Actor Tools",
						help: `Actor "Feature/Spell Cleaner," "Prepared Spell Mass-Toggler," etc. buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
					}),
					minimumRoleTableTools: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Other Table Tools",
						help: `Table "Row Cleaner" button will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
					}),
					minimumRoleDirectoryCleaner: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Directory Cleaner",
						help: `"Directory Cleaner" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleDirectoryDeduplicator: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Directory Deduplicator",
						help: `"Directory Deduplicator" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleDirectoryMover: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Bulk Directory Mover",
						help: `"Bulk Directory Mover" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleBulkOwnershipEditor: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Bulk Ownership Editor",
						help: `"Bulk Ownership Editor" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleBulkPrototypeTokenEditor: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Bulk Prototype Token Editor",
						help: `"Bulk Prototype Token Editor" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleOwnershipUpdater: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Compendium Ownership Updater",
						help: `"Compendium Ownership Updater" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleLootGenerator: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Loot Generator",
						help: `"Loot Generator" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleContentUpdater: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Content Updater",
						help: `"Content Updater" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRolePackageImporter: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Package Importer",
						help: `"Package Importer" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleImagePreloader: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for Importer Image Preloader",
						help: `"Importer Image Preloader" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					isAddClearFlagsContextMenu: {
						name: `Add &quot;Clear Flags&quot; Context Option`,
						help: `If enabled a "Clear Flags" option will be added to directory document context menus. This option will clear all "plutonium" flags from a document, and the document's embedded documents. Note that this will negatively impact Plutonium functionality for the document.`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
					},
				},
			},
			text: {
				name: "Text and Tags",
				settings: {
					isEnableHoverForLinkTags: {
						name: `Enable Hover Popups for &quot;@tag&quot; Links`,
						help: `If links rendered from @tag syntax should display popups when hovered.`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
					},
					isAutoRollActorItemTags: {
						name: "Roll Items Linked by @UUID[Actor.Item.] on Click",
						help: `If enabled, clicking a rendered @UUID[Actor. ... Item. ...] tag will roll the linked embedded item. If disabled, or on SHIFT-click, the default action (opening the item's sheet) is taken.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
					isJumpToFolderTags: {
						name: "Show Folder Linked by @UUID[Folder.] on Click",
						help: `If enabled, clicking a rendered @UUID[Folder. ...] tag will switch to that folder's tab and scroll the folder into view. If disabled, or on SHIFT-click, the default action (opening the folder's sheet) is taken.`,
						default: true,
						type: "boolean",
						isPlayerEditable: true,
					},
					isShowLinkParent: {
						name: "Show Parent Icon/Name For Child @UUIDs",
						help: `If enabled, a rendered @UUID[<parentDocumentName>.<parentId>.<documentName>.<documentId>] tag will display the icon of the parent document type and the name of the parent document, in addition to the usual icon of the document type and the name of the document.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
			},
			misc: {
				name: "Miscellaneous",
				settings: {
					isSkipAddonAutomationCheck: {
						name: "Skip Addon: Automation Check",
						help: `Avoid posting to chat if the Addon: Automation companion model is not installed.`,
						default: false,
						type: "boolean",
					},
					isSkipBackendCheck: {
						name: "Skip Backend Check",
						help: `Avoid sending a network request during module initialization to check if the modded Plutonium backend is installed.`,
						default: false,
						type: "boolean",
						isPlayerEditable: true,
					},
				},
				settingsAdvanced: {
					backendEndpoint: {
						name: "Custom Backend Endpoint",
						help: `The API endpoint used to make calls to the modded Plutonium backend, if available. Note that this API is considered "internal," and is therefore undocumented, and may change on a per-version basis.`,
						default: null,
						placeholder: "(Use default)",
						type: "url",
						additionalStyleClasses: "code",
						isNullable: true,
					},
					isPatchFromUuid: {
						name: "Patch <code>fromUuid</code>",
						help: `Patch the built-in Foundry function "fromUuid" to allow Plutonium-specific UUIDs to be processed. This improves compatibility with some modules.`,
						default: true,
						type: "boolean",
						isReloadRequired: true,
					},
					isDebugDocumentOperations: {
						name: "Debug Document Operations",
						help: `When creating/updating documents, log additional debug info.`,
						type: "boolean",
						default: false,
						unlockCode: "debug",
					},
					isDebugFromUuid: {
						name: "Debug <code>fromUuid</code>",
						help: `When running patched "fromUuid" and "fromUuidSync", log additional debug info.`,
						type: "boolean",
						default: false,
						unlockCode: "debug",
					},
					isSetDocumentOperationsCanaryFlags: {
						name: "Set Document Operations Canary Flags",
						help: `When creating/updating documents, set canary flags.`,
						type: "boolean",
						default: false,
						unlockCode: "debug",
					},
					isDebugImageFetching: {
						name: "Debug Image Fetching",
						help: `When fetching images, log additional debug info.`,
						type: "boolean",
						default: false,
						unlockCode: "debug",
					},
				},
			},
			equipmentShop: {
				name: "Equipment Shop",
				settings: {
					priceMultiplier: {
						name: "Price Multiplier",
						help: `A factor by which the prices in the equipment shop are multiplied.`,
						default: 1.0,
						type: "percentage",
						min: 0.0001,
					},
					startingGold: {
						name: "Class Starting Gold",
						help: `A starting gold amount to use instead of a class's starting gold, when using the equipment shop during class creation.`,
						default: null,
						type: "number",
						isNullable: true,
					},
					minimumRole: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level",
						help: `The "Equipment Shop" button will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
					}),
				},
				settingsAdvanced: {
					minimumRoleAllowOverSpending: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level For Over-Spending",
						help: `If enabled, the shop will allow a buyer to spend more gold than they possess.`,
						dfault: CONST.USER_ROLES.GAMEMASTER,
					}),
				},
			},
			currency: {
				name: "Currency",
				settingsAdvanced: {
					isNpcUseCurrencySheetItems: {
						name: "Import Currency as Sheet Item for NPCs",
						help: `If enabled, the currency component of loot drag-dropped to an NPC sheet will be added as a sheet item. If disabled, it will be added as "currency" data instead, which the default ${SharedConsts.SYSTEM_ID_DND5E} sheet does not display.`,
						default: true,
						type: "boolean",
					},
				},
			},
			dataSources: {
				name: "Data Sources",
				btnsAdditional: [
					{
						name:	"World Data Source Selector",
						icon: "fas fa-fw fa-globe-africa",
						onClick: async () => {
							const {WorldDataSourceSelector} = await Promise.resolve().then(function () { return WorldDataSourceSelector$1; });
							WorldDataSourceSelector.pHandleButtonClick().then(null);
						},
					},
					{
						name: "World Content Blocklist",
						icon: "fas fa-fw fa-ban",
						onClick: async () => {
							const {WorldContentBlocklistSourceSelector} = await Promise.resolve().then(function () { return WorldContentBlocklist$1; });
							WorldContentBlocklistSourceSelector.pHandleButtonClick().then(null);
						},
					},
				],
				settings: {
					isPlayerEnableSourceSelection: {
						name: "Enable Data Source Filtering for Players",
						help: `Whether or not ${ConfigConsts._STR_DATA_SOURCES} are filtered down to only those chosen in the "World Data Source Selector" application. Applies to players only.`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
					},
					isGmEnableSourceSelection: {
						name: "Enable Data Source Filtering for GMs",
						help: `Whether or not ${ConfigConsts._STR_DATA_SOURCES} are filtered down to only those chosen in the "World Data Source Selector" application. Applies to GMs only.`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
					},
					isPlayerForceSelectAllowedSources: {
						name: "Force Select All for Players",
						help: `Whether or not all available ${ConfigConsts._STR_DATA_SOURCES} are forcibly selected for players. Note that this can seriously degrade performance for players if data source filtering is not also enabled.`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
					},
					isGmForceSelectAllowedSources: {
						name: "Force Select All for GMs",
						help: `Whether or not all available ${ConfigConsts._STR_DATA_SOURCES} are forcibly selected for GMs. Note that this can seriously degrade performance for GMs if data source filtering is not also enabled.`,
						default: false,
						type: "boolean",
						isReloadRequired: true,
					},
					isLoadLocalPrereleaseIndex: {
						name: "Load Local Prerelease Content",
						help: `If enabled, the directory specified by the "Local Prerelease Content Directory" option will be read, and its contents added to the list of available sources.`,
						default: false,
						type: "boolean",
					},
					localPrereleaseDirectoryPath: {
						name: "Local Prerelease Content Directory",
						help: `The sub-directory of the "User Data" directory from which prerelease content should be automatically loaded if the "Load Local Prerelease" option is enabled.`,
						default: `assets/prerelease`,
						type: "string",
						additionalStyleClasses: "code",
					},
					isUseLocalPrereleaseIndexJson: {
						name: `Use <code>index.json</code> for Local Prerelease Content`,
						help: `If, rather than read the local prerelease content directory directly, an "index.json" file should be read when loading local prerelease content. This file should be of the form: {"toImport": [ ... list of filenames ... ]}. Note that this is required if players do not have "Use File Browser" permissions.`,
						default: false,
						type: "boolean",
					},
					localPrerelease: {
						name: "Additional Prerelease Files",
						help: `Prerelease files which should be automatically loaded and added to the list of available sources.`,
						default: [],
						type: "arrayStringShort",
						isCaseSensitive: true,
					},
					isLoadLocalHomebrewIndex: {
						name: "Load Local Homebrew",
						help: `If enabled, the directory specified by the "Local Homebrew Directory" option will be read, and its contents added to the list of available sources.`,
						default: false,
						type: "boolean",
					},
					localHomebrewDirectoryPath: {
						name: "Local Homebrew Directory",
						help: `The sub-directory of the "User Data" directory from which homebrew should be automatically loaded if the "Load Local Homebrew" option is enabled.`,
						default: `assets/homebrew`,
						type: "string",
						additionalStyleClasses: "code",
					},
					isUseLocalHomebrewIndexJson: {
						name: `Use <code>index.json</code> for Local Homebrew`,
						help: `If, rather than read the local homebrew directory directly, an "index.json" file should be read when loading local homebrew. This file should be of the form: {"toImport": [ ... list of filenames ... ]}. Note that this is required if players do not have "Use File Browser" permissions.`,
						default: false,
						type: "boolean",
					},
					localHomebrew: {
						name: "Additional Homebrew Files",
						help: `Homebrew files which should be automatically loaded and added to the list of available sources.`,
						default: [],
						type: "arrayStringShort",
						isCaseSensitive: true,
					},
					minimumRoleWorldDatasourceSelector: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for World Data Source Selector",
						help: `"World Data Source Selector" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
					minimumRoleBlocklist: ConfigConsts._template_getMinimumRole({
						name: "Minimum Permission Level for World Content Blocklist",
						help: `"World Content Blocklist" buttons will be hidden for any user with a role less than the chosen role.`,
						isReloadRequired: true,
						isGmOnly: true,
					}),
				},
				settingsAdvanced: {
					tooManySourcesWarningThreshold: {
						name: "Auto-Selected Source Count Warning Threshold",
						help: `If set, a warning will be shown when auto-selecting a number of sources greater than this value, which usually occurs if a "Force Select All..." option is set, without also "Enabl[ing] Data Source Filtering."`,
						default: 50,
						type: "integer",
						isNullable: true,
					},
					baseSiteUrl: {
						name: "Base Site URL",
						help: `The root server URL from which to load data and source images, and to link in rendered text. Note that, where possible, the module will use its own built-in data files, rather than call out to a remote server.`,
						type: "url",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
						isReloadRequired: true,
					},
					baseMediaUrlImg: {
						name: "Base Media URL (<code>img</code>)",
						help: `The base URL to use when evaluating internal image paths. For example, a base URL of "https://example.com" and an internal image path of "bestiary/Goblin.webp" would produce an evaluated URL of "https://example.com/bestiary/Goblin.webp".`,
						type: "url",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
						isReloadRequired: true,
					},
					isNoLocalData: {
						name: "Avoid Loading Local Data",
						help: `If enabled, any data which would normally be loaded from the module's local copies is instead loaded from the sites URL (which may be customised by editing the "Base Site Url" config option).`,
						default: false,
						type: "boolean",
					},
					isNoPrereleaseBrewIndexes: {
						name: "Avoid Loading Prerelease/Homebrew Indexes on Startup",
						help: `If enabled, prerelease/homebrew repository indexes won't be loaded during initial module load. This will effectively prevent any prerelease/homebrew sources from appearing in source listings. Note that these indexes are loaded in the background/asynchronously during normal operation, so should not negatively impact game load times, unless you have a particularly terrible internet connection.`,
						default: false,
						type: "boolean",
					},
					basePrereleaseUrl: {
						name: "Base Prerelease Repository URL",
						help: `The root GitHub repository URL from which to load data and source images, and to link in rendered text, when importing prerelease content. URLs should be of the form "https://raw.githubusercontent.com/[username]/[repository name]/[branch name]".`,
						type: "url",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
						isReloadRequired: true,
					},
					baseBrewUrl: {
						name: "Base Homebrew Repository URL",
						help: `The root GitHub repository URL from which to load data and source images, and to link in rendered text, when importing homebrew content. URLs should be of the form "https://raw.githubusercontent.com/[username]/[repository name]/[branch name]".`,
						type: "url",
						additionalStyleClasses: "code",
						default: null,
						isNullable: true,
						isReloadRequired: true,
					},
				},
			},
			/* integrationQuickInsert: {
				name: "Integrations (Quick Insert)",
				settings: {
					...ConfigConsts._template_getModuleFauxCompendiumIndexSettings({moduleName: "Quick Insert"}),
					pagesHidden: {
						name: "Hidden Categories",
						help: `Categories of entity which should not be indexed.`,
						default: ConfigConsts._SEARCH_INTEGRATION_PAGE_METAS.mergeMap(({page}) => ({[page]: page === UrlUtil.PG_RECIPES})),
						type: "multipleChoice",
						choices: ConfigConsts._SEARCH_INTEGRATION_PAGE_METAS
							.map(({page, displayPage}) => ({value: page, name: displayPage})),
					},
					isDisplaySource: {
						name: "Display Sources",
						help: `If enabled, a source abbreviation will be displayed on each result. If disabled, the module name will be shown instead.`,
						default: true,
						type: "boolean",
					},
				},
			},
			integrationSpotlightOmnisearch: {
				name: "Integrations (Spotlight Omnisearch)",
				settings: {
					...ConfigConsts._template_getModuleFauxCompendiumIndexSettings({moduleName: "Spotlight Omnisearch"}),
					pagesHidden: {
						name: "Hidden Categories",
						help: `Categories of entity which should not be indexed.`,
						default: ConfigConsts._SEARCH_INTEGRATION_PAGE_METAS.mergeMap(({page}) => ({[page]: page === UrlUtil.PG_RECIPES})),
						type: "multipleChoice",
						choices: ConfigConsts._SEARCH_INTEGRATION_PAGE_METAS
							.map(({page, displayPage}) => ({value: page, name: displayPage})),
					},
				},
			},
			integrationFoundrySummons: {
				name: "Integrations (Foundry Summons)",
				settings: {
					...ConfigConsts._template_getModuleFauxCompendiumIndexSettings({moduleName: "Foundry Summons"}),
				},
			},
			integrationBabele: {
				name: "Integrations (Babele)",
				settings: {
					isEnabled: {
						name: "Enabled",
						help: `If enabled, and the Babele module is active, Plutonium will attempt to translate parts of imported content.`,
						default: true,
						type: "boolean",
					},
					isUseTranslatedDescriptions: {
						name: "Use Translated Descriptions",
						help: `If enabled, and a translated description is found for a document during import, that description will be used instead of the Plutonium default. Note that this may result in embedded functionality (for example, links between documents) being removed.`,
						default: true,
						type: "boolean",
					},
				},
			},
			integrationThreeDiCanvas: {
				name: "Integrations (3D Canvas)",
				settings: {
					isSetThreeDiModels: {
						name: "Allow Importer to Set 3D Models",
						help: `If enabled, and the 3D Canvas, 3D Canvas Mapmaking Pack, and 3D Canvas Token Collection modules are active, Plutonium will attempt to set the "3D Model" field on imported tokens.`,
						default: true,
						type: "boolean",
						isReloadRequired: true,
					},
				},
			}, */
		};
	}
  static _DEFAULT_CONFIG_SORTED = null;
  static getDefaultConfigSorted_() {
    //Returns _DEFAULT_CONFIG_SORTED if it has already been set, if not, it sorts and sets _DEFAULT_CONFIG_SORTED
    return this._DEFAULT_CONFIG_SORTED = this._DEFAULT_CONFIG_SORTED
      || Object.entries(this.getDefaultConfig_()).sort(([, entry1], [, entry2]) => SortUtil.ascSortLower(entry1.name, entry2.name));
  }
  static _DEFAULT_CONFIG_SORTED_FLAT = null;
  static getDefaultConfigSortedFlat_() {
    //Returns _DEFAULT_CONFIG_SORTED_FLAT if it has already been set
    if (this._DEFAULT_CONFIG_SORTED_FLAT) { return this._DEFAULT_CONFIG_SORTED_FLAT; }

    //If not, it sets _DEFAULT_CONFIG_SORTED_FLAT and returns itself
    return this._DEFAULT_CONFIG_SORTED_FLAT = this._DEFAULT_CONFIG_SORTED_FLAT
    || this.getDefaultConfigSorted_().map(([_0x102f4b, _0x540fe5]) => {
      const _0x417b84 = {};
      this._KEYS_SETTINGS_METAS.forEach(meta => {
        Object.entries(_0x540fe5[meta] || {}).forEach(([_0x70d0f8, _0x41ed31]) => {
          _0x417b84[_0x70d0f8] = _0x41ed31;
        });
      });
      return [_0x102f4b, _0x417b84];
    });
  }
  static ["getCompendiumPaths"]() {
    const _0x525cb1 = [];
    Object.entries(this.getDefaultConfig_()).forEach(([_0x3661aa, _0x57ce92]) => {
      this._KEYS_SETTINGS_METAS.forEach(_0x435517 => {
        if (!_0x57ce92[_0x435517]) {
          return;
        }
        Object.entries(_0x57ce92[_0x435517]).forEach(([_0x57b4d8, _0x1b0cb0]) => {
          if (_0x1b0cb0.typeSub !== "compendiums") {
            return;
          }
          _0x525cb1.push([_0x3661aa, _0x57b4d8]);
        });
      });
    });
    return _0x525cb1;
  }
}
ConfigConsts._STR_DATA_SOURCES = "\"data sources\" (e.g. those displayed in the Import Wizard)";
ConfigConsts._KEYS_SETTINGS_METAS = ["settings", "settingsHacks", "settingsAdvanced"];
ConfigConsts._TEMPLATE_ENTITY_OWNERSHIP = {
  'name': "Default Ownership",
  'default': 0x0,
  'type': "enum"
};
ConfigConsts._TEMPALTE_MINIMUM_ROLE = {
  'default': 0x0,
  'type': "enum",
  'isReloadRequired': true
};
ConfigConsts._DISP_METRIC_POUNDS = "1 pound ≈ 0.5 kilograms";
ConfigConsts._DISP_METRIC_FEET = "5 feet ≈ 1.5 metres";
ConfigConsts._DISP_METRIC_MILES = "1 mile ≈ 1.6 kilometres";
ConfigConsts.SRD_COMPENDIUMS_CREATURES = [SharedConsts.SYSTEM_ID_DND5E + ".monsters"];
ConfigConsts.SRD_COMPENDIUMS_CREATURE_FEATURES = [SharedConsts.SYSTEM_ID_DND5E + ".monsterfeatures"];
ConfigConsts.SRD_COMPENDIUMS_CLASSES = [SharedConsts.SYSTEM_ID_DND5E + ".classes"];
ConfigConsts.SRD_COMPENDIUMS_SUBCLASSES = [SharedConsts.SYSTEM_ID_DND5E + ".subclasses"];
ConfigConsts.SRD_COMPENDIUMS_CLASS_FEATURES = [SharedConsts.SYSTEM_ID_DND5E + ".classfeatures"];
ConfigConsts.SRD_COMPENDIUMS_ITEMS = [SharedConsts.SYSTEM_ID_DND5E + '.items', SharedConsts.SYSTEM_ID_DND5E + ".tradegoods"];
ConfigConsts.SRD_COMPENDIUMS_SPELLS = [SharedConsts.SYSTEM_ID_DND5E + '.spells'];
ConfigConsts.SRD_COMPENDIUMS_OPTIONAL_FEATURES = [SharedConsts.SYSTEM_ID_DND5E + ".classfeatures"];
ConfigConsts.SRD_COMPENDIUMS_RACES_AND_FEATURES = [SharedConsts.SYSTEM_ID_DND5E + ".races"];
ConfigConsts.SRD_COMPENDIUMS_BACKGROUNDS_AND_FEATURES = [SharedConsts.SYSTEM_ID_DND5E + ".backgrounds"];
ConfigConsts.SRD_COMPENDIUMS_TABLES = [SharedConsts.SYSTEM_ID_DND5E + ".tables"];
/* ConfigConsts._QUICK_INSERT_PAGE_METAS = [...new Set(Renderer.tag.TAGS.filter(_0x244883 => _0x244883.page).map(_0x2e0a71 => _0x2e0a71.page).filter(_0x5b9350 => ![UrlUtil.PG_QUICKREF, "skill", "sense", "card", 'legroup'].includes(_0x5b9350)))].map(_0x207d8d => {
  let _0x1333af = UrlUtil.pageToDisplayPage(_0x207d8d);
  if (_0x1333af === _0x207d8d) {
    _0x1333af = Parser.getPropDisplayName(_0x207d8d);
  }
  return {
    'page': _0x207d8d,
    'displayPage': _0x1333af
  };
}).sort(({
  displayPage: _0xb12442
}, {
  displayPage: _0xb84237
}) => SortUtil.ascSortLower(_0xb12442, _0xb84237)); */
ConfigConsts.C_ART_IMAGE_MODE_TOKEN = 0x0;
ConfigConsts.C_ART_IMAGE_MODE_TILE = 0x1;
ConfigConsts.C_ART_IMAGE_MODE_NOTE = 0x2;
ConfigConsts.C_ART_IMAGE_MODE_SCENE = 0x3;
ConfigConsts.C_ART_DROP_ANCHOR_CENTER = 0x0;
ConfigConsts.C_ART_DROP_ANCHOR_TOP_LEFT = 0x1;
ConfigConsts.C_ART_IMAGE_SAVE_MODE__DEFAULT = 0x0;
ConfigConsts.C_ART_IMAGE_SAVE_MODE__ALWAYS = 0x1;
ConfigConsts.C_ART_IMAGE_SAVE_MODE__NEVER = 0x2;
ConfigConsts.C_IMPORT_DEDUPE_MODE_NONE = 0x0;
ConfigConsts.C_IMPORT_DEDUPE_MODE_SKIP = 0x1;
ConfigConsts.C_IMPORT_DEDUPE_MODE_OVERWRITE = 0x2;
ConfigConsts.C_IMPORT_DRAG_DROP_MODE_NEVER = 0x0;
ConfigConsts.C_IMPORT_DRAG_DROP_MODE_PROMPT = 0x1;
ConfigConsts.C_IMPORT_DRAG_DROP_MODE_ALWAYS = 0x2;
ConfigConsts.C_CREATURE_NAMETAGS_CR = 0x0;
ConfigConsts.C_CREATURE_NAMETAGS_TYPE = 0x1;
ConfigConsts.C_CREATURE_NAMETAGS_TYPE_WITH_TAGS = 0x2;
ConfigConsts.C_SPELL_POINTS_MODE__DISABLED = 0x0;
ConfigConsts.C_SPELL_POINTS_MODE__ENABLED = 0x1;
ConfigConsts.C_SPELL_POINTS_MODE__ENABLED_AND_UNLIMITED_SLOTS = 0x2;
ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM = "sheetItem";
ConfigConsts.C_SPELL_POINTS_RESOURCE__ATTRIBUTE_CUSTOM = "attributeCustom";
ConfigConsts.C_ITEM_ATTUNEMENT_NONE = 0x0;
ConfigConsts.C_ITEM_ATTUNEMENT_REQUIRED = 0x1;
ConfigConsts.C_ITEM_ATTUNEMENT_ATTUNED = 0x2;
ConfigConsts.C_ITEM_ATTUNEMENT_NEVER = 0x0;
ConfigConsts.C_ITEM_ATTUNEMENT_SMART = 0x1;
ConfigConsts.C_ITEM_ATTUNEMENT_ALWAYS = 0x2;
ConfigConsts.C_USE_GAME_DEFAULT = 'VE_USE_GAME_DEFAULT';
ConfigConsts.C_USE_PLUT_VALUE = "VE_USE_MODULE_VALUE";
ConfigConsts.C_BOOL_DISABLED = 0x0;
ConfigConsts.C_BOOL_ENABLED = 0x1;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_NONE = 0x0;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_STANDARD = 0x1;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_GM = 0x2;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_BLIND = 0x3;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_SELF = 0x4;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_HIDDEN = 0x5;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_MIN = 0x6;
ConfigConsts.C_TOKEN_NPC_HP_ROLL_MODE_MAX = 0x7;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE = 0x0;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN = 0x1;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MAX = 0x2;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL = 0x3;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM = 0x4;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE = 0x5;
ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES = {
  [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE]: "Take Average",
  [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN]: "Minimum Value",
  [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MAX]: "Maximum Value",
  [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL]: "Roll",
  [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM]: "Roll (Custom Formula)",
  [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE]: "Do Not Increase HP"
};
//#endregion

//#region Consts
class Consts {
  static RUN_TIME = `${Date.now()}`;
  static FLAG_IFRAME_URL = "iframe_url";

  static TERMS_COUNT = [{
      tokens: ["once"],
      count: 1
  }, {
      tokens: ["twice"],
      count: 2
  }, {
      tokens: ["thrice"],
      count: 3
  }, {
      tokens: ["three", " ", "times"],
      count: 3
  }, {
      tokens: ["four", " ", "times"],
      count: 4
  }, ];

  static Z_INDEX_MAX_FOUNDRY = 9999;

  static ACTOR_TEMP_NAME = "Importing...";

  static CHAR_MAX_LEVEL = 20;

  static RE_ID_STR = `[A-Za-z0-9]{16}`;
  static RE_ID = new RegExp(`^${this.RE_ID_STR}$`);

  static FLAG_IS_DEV_CLEANUP = "isDevCleanup";

  static USER_DATA_TRACKING_KEYS__ACTOR = ["system.details.biography.value",
  "system.attributes.hp.value", "system.attributes.death.success", "system.attributes.death.failure", "system.attributes.exhaustion", "system.attributes.inspiration",
  "system.details.xp.value",
  "system.resources.primary.value", "system.resources.secondary.value", "system.resources.tertiary.value", "system.resources.legact.value", "system.resources.legres.value", "system.resources.lair.value",
  "system.currency.cp", "system.currency.sp", "system.currency.ep", "system.currency.gp", "system.currency.pp", ];
}
//#endregion
//#region Config
class Config {
  
  static _IS_INIT = false;
  static _IS_INIT_SAVE_REQUIRED = false;
  static get backendEndpoint() {
    const _0xa1e040 = Config.get("misc", "backendEndpoint");
    if (_0xa1e040) {
      return _0xa1e040;
    }
    return ROUTE_PREFIX ? '/' + ROUTE_PREFIX + "/api/plutonium" : "/api/plutonium";
  }

  static get isInit() { return this._IS_INIT; }

  static prePreInit() { this._preInit_doLoadConfig(); }

  static _preInit_getLoadedConfig() {
    //Tries to ask foundry for existing game settings
    let existingConfig = UtilGameSettings.getSafe(SharedConsts.MODULE_ID, Config._SETTINGS_KEY);
    //If none are found, we create some new ones
    if (existingConfig == null || !Object.keys(existingConfig).length) {
      return { 'isLoaded': false, 'config': Config._getDefaultGmConfig() }; //Using the default gm config
    }
    //Or we load the config that was found, and make sure to migrate it incase it is an out of date version
    return { 'isLoaded': true, 'config': ConfigMigration.getMigrated({ 'config': existingConfig }) };
  }

  static _preInit_doLoadConfig() {
    this._pPrePreInit_registerSettings(); //Registers some settings into foundry
    //Tries to load an existing config
    const { isLoaded: isLoaded, config: config } = this._preInit_getLoadedConfig();
    Config._CONFIG = config;
    if (isLoaded) { //If we managed to load an existing config
      const isSaveRequired = this._populateMissingConfigValues(Config._CONFIG, { 'isPlayer': false });
      this._IS_INIT_SAVE_REQUIRED = this._IS_INIT_SAVE_REQUIRED || isSaveRequired;
    }//TEMPFIX some boring foundry stuff
    /*  game.socket.on(this._SOCKET_ID, _0x11513f => {
      switch (_0x11513f.type) {
        case "config.update":
          {
            const _0x2829e6 = _0x11513f.config;
            const _0x218c03 = MiscUtil.copy(Config._CONFIG);
            Object.assign(Config._CONFIG, _0x2829e6);
            if (!UtilPrePreInit.isGM()) {
              ConfigApp.handleGmConfigUpdate(_0x2829e6);
            }
            UtilHooks.callAll(UtilHooks.HK_CONFIG_UPDATE, {
              'previous': _0x218c03,
              'current': MiscUtil.copy(Config._CONFIG)
            });
            break;
          }
      }
    });
    if (!UtilPrePreInit.isGM()) {
      const _0x2f835b = GameStorage.getClient(Config._CLIENT_SETTINGS_KEY);
      if (_0x2f835b == null) {
        Config._CONFIG_PLAYER = Config._getDefaultPlayerConfig();
      } else {
        Config._CONFIG_PLAYER = _0x2f835b;
        const _0x2803d0 = this._populateMissingConfigValues(Config._CONFIG_PLAYER, {
          'isPlayer': true
        });
        this._IS_INIT_SAVE_REQUIRED = this._IS_INIT_SAVE_REQUIRED || _0x2803d0;
      }
    } */

    //Do some check on compability to other modules
    this._pInit_initCompatibilityTempOverrides();
    this._IS_INIT = true;
  }

  static ['_COMPATIBILITY_TEMP_OVERRIDES'] = null;
  static _pInit_initCompatibilityTempOverrides() {

    ConfigConsts.getDefaultConfigSortedFlat_().forEach(([propName, propValue]) => {
      Object.entries(propValue).forEach(([k, v]) => {
        if (!v.compatibilityModeValues) { return; }
        Object.entries(v.compatibilityModeValues).find(([key, val]) => {
          const enumVal = v.type === "enum" ? ConfigUtilsSettings.getEnumValueValue(val) : val;
          const enumName = v.type === "enum" ? val.name || enumVal : enumVal;
          if (!UtilCompat.isModuleActive(key)) { return false; }

          const configVal = Config.get(propName, k);
          const isEquals = !CollectionUtil.deepEquals(enumVal, configVal);
          Config.setTemp(propName, k, enumVal, { 'isSkipPermissionCheck': true });
          if (isEquals) {
            const { displayGroup, displayKey } = Config._getDisplayLabels(propName, k);
            const jsonConfig = configVal != null ? JSON.stringify(configVal) : configVal;
            const jsonEnum = enumName != null ? JSON.stringify(enumName) : enumName;
            this._COMPATIBILITY_TEMP_OVERRIDES = this._COMPATIBILITY_TEMP_OVERRIDES || {};
            MiscUtil.set(this._COMPATIBILITY_TEMP_OVERRIDES, propName, k, {
              value: enumVal,
              message: "\"" + displayGroup + " -&gt; " + displayKey + "\" value `" + jsonConfig + "` has compatibility issues with module \"" + game.modules.get(key).title + "\" (must be set to `" + jsonEnum + '`)'
            });
            console.warn(...LGT, game.modules.get(key).title + " detected! Setting compatibility config: " 
            + propName + '.' + k + " = " + jsonEnum + " (was " + jsonConfig + "). If you encounter unexpected issues, consider disabling either module.");
          }
        });
      });
    });
  }
  static _hasCompatibilityWarnings() {
    return this._COMPATIBILITY_TEMP_OVERRIDES != null;
  }
  static _getCompatibilityWarnings() {
    if (!this._COMPATIBILITY_TEMP_OVERRIDES) {
      return '';
    }
    const _0x35b741 = Object.values(this._COMPATIBILITY_TEMP_OVERRIDES).map(_0x152dda => Object.values(_0x152dda).map(_0x120f14 => _0x120f14.message)).flat().map(_0xcf5598 => " - " + _0xcf5598).join("\n");
    return "Click to resolve config module compatibility issues. Issues detected:\n" + _0x35b741 + '.';
  }
  static ["_doResolveCompatibility"]() {
    Object.entries(this._COMPATIBILITY_TEMP_OVERRIDES).forEach(([_0xf82a5d, _0x3d417f]) => {
      Object.entries(_0x3d417f).forEach(([_0x10d0e6, _0x5141bd]) => {
        Config.set(_0xf82a5d, _0x10d0e6, _0x5141bd.value);
      });
    });
    this._COMPATIBILITY_TEMP_OVERRIDES = null;
  }
  static _pPrePreInit_registerSettings() {
    //TEMPFIX
    /* game.settings.register(SharedConsts.MODULE_ID, Config._SETTINGS_KEY, {
      'name': 'Config',
      'default': {},
      'type': Object,
      'scope': "world",
      'onChange': _0x2cf485 => {}
    }); */
  }
  static pOpen({
    evt = null,
    initialVisibleGroup = null
  } = {}) {
    return ConfigApp.pOpen({
      'evt': evt,
      'initialVisibleGroup': initialVisibleGroup,
      'backend': this
    });
  }
  static _populateMissingConfigValues(config, opts) {
      opts = opts || {};
      const isPlayer = !!opts.isPlayer;
      let _0x811367 = false;
      Object.entries(this._getDefaultConfig({
        'isPlayer': isPlayer
      })).forEach(([_0x159930, _0x40e344]) => {
        if (!config[_0x159930]) {
          config[_0x159930] = _0x40e344;
          _0x811367 = true;
        }
        else {
          Object.entries(_0x40e344).forEach(([_0xfb319f, _0x2cb8c5]) => {
            if (config[_0x159930][_0xfb319f] === undefined) {
              config[_0x159930][_0xfb319f] = _0x2cb8c5;
              _0x811367 = true;
            }
          });
        }
      });
      return _0x811367;
  }
  static async pInit() {
    if (this._IS_INIT_SAVE_REQUIRED) {
      Config._saveConfigDebounced();
    }
    this._IS_INIT_SAVE_REQUIRED = false;
  }
  static _getDefaultGmConfig() {
    return this._getDefaultConfig({ 'isPlayer': false });
  }
  static ["_getDefaultPlayerConfig"]() {
    return this._getDefaultConfig({
      'isPlayer': true
    });
  }
  static _getDefaultConfig(opts) {
    opts = opts || {};
    const isPlayer = opts.isPlayer;
    const configConsts = MiscUtil.copy(ConfigConsts.getDefaultConfigSorted_());
    const outputConfig = {};
    configConsts.forEach(([propName, propValue]) => {
      const _0x5a892a = outputConfig[propName] = {};
      const _0x2a5160 = _0x1fa78d => Object.entries(_0x1fa78d).forEach(([_0x249b71, _0x38a295]) => {
        if (isPlayer) {
          if (_0x38a295.isPlayerEditable) {
            _0x5a892a[_0x249b71] = null;
          }
        } else {
          _0x5a892a[_0x249b71] = _0x38a295["default"];
        }
      });
      if (propValue.settings) {
        _0x2a5160(propValue.settings);
      }
      if (propValue.settingsAdvanced) {
        _0x2a5160(propValue.settingsAdvanced);
      }
      if (propValue.settingsHacks) {
        _0x2a5160(propValue.settingsHacks);
      }
    });
    outputConfig.version = ConfigMigration.CURRENT_VERSION;
    return outputConfig;
  }
  static ['set'](_0x4f9d2a, _0x1112ce, _0xc4fc91) {
    if (!this._isCanSetConfig(_0x4f9d2a, _0x1112ce)) {
      return;
    }
    const _0x122bb6 = Config.get(_0x4f9d2a, _0x1112ce);
    const _0x5ededb = UtilPrePreInit.isGM() ? Config._CONFIG : Config._CONFIG_PLAYER;
    (_0x5ededb[_0x4f9d2a] = _0x5ededb[_0x4f9d2a] || {})[_0x1112ce] = _0xc4fc91;
    Config._saveConfigDebounced();
    this._fireConfigUpdateHook(_0x4f9d2a, _0x1112ce, _0x122bb6, _0xc4fc91);
  }
  static ['setTemp'](_0x43e89c, _0x14b600, _0x30dc13, {
    isSkipPermissionCheck = false
  } = {}) {
    if (!isSkipPermissionCheck && !this._isCanSetConfig(_0x43e89c, _0x14b600)) {
      return;
    }
    const _0x10d336 = Config.get(_0x43e89c, _0x14b600);
    (Config._CONFIG_TEMP[_0x43e89c] = Config._CONFIG_TEMP[_0x43e89c] || {})[_0x14b600] = _0x30dc13;
    this._fireConfigUpdateHook(_0x43e89c, _0x14b600, _0x10d336, _0x30dc13);
  }
  static ["setRivetTargetDocument"]({
    actor: _0x7aa906,
    pack: _0x11cb33
  } = {}) {
    if (_0x7aa906 && _0x11cb33) {
      throw new Error("Only one of \"actor\" or \"pack\" may be specified!");
    }
    if (!_0x7aa906 && !_0x11cb33) {
      ui.notifications.info("Cleared Rivet import target. Rivet will now import to an appropriate directory.");
      Config.set("rivet", "targetDocumentId", null);
      return;
    }
    if (_0x7aa906) {
      const _0x4dae8a = _0x7aa906.isToken ? _0x7aa906.uuid : _0x7aa906.id;
      if (Config.get("rivet", "targetDocumentId") === _0x4dae8a) {
        Config.set("rivet", "targetDocumentId", null);
        ui.notifications.warn("Cleared Rivet import target. Rivet will now import to an appropriate directory.");
        return;
      }
      Config.set("rivet", 'targetDocumentId', _0x4dae8a);
      ui.notifications.info("Set Rivet import target. Rivet will now import to Actor \"" + _0x7aa906.name + "\" (" + _0x4dae8a + "). This can be changed in the Config.");
      return;
    }
    if (_0x11cb33) {
      const _0xef065a = 'Compendium.' + _0x11cb33.metadata.id;
      if (Config.get('rivet', 'targetDocumentId') === _0xef065a) {
        Config.set("rivet", "targetDocumentId", null);
        ui.notifications.warn("Cleared Rivet import target. Rivet will now import to an appropriate directory.");
        return;
      }
      Config.set('rivet', "targetDocumentId", _0xef065a);
      ui.notifications.info("Set Rivet import target. Rivet will now import to Compendium \"" + _0x11cb33.metadata.label + "\" (" + _0x11cb33.metadata.id + "). This can be changed in the Config.");
    }
  }
  static ["_fireConfigUpdateHook"](_0x374034, _0xb156d3, _0x305b29, _0xea010c) {
    UtilHooks.callAll(UtilHooks.HK_CONFIG_UPDATE, {
      'previous': {
        [_0x374034]: {
          [_0xb156d3]: _0x305b29
        }
      },
      'current': {
        [_0x374034]: {
          [_0xb156d3]: _0xea010c
        }
      }
    });
  }
  static ["_isCanSetConfig"](_0x347dfb, _0x3965df) {
    return UtilPrePreInit.isGM() || ConfigUtilsSettings.isPlayerEditable(_0x347dfb, _0x3965df);
  }
  static ["_LOCK_SAVE_CONFIG"] = new VeLock({
    'name': "save config"
  });
  static async ["_pSaveConfig"]() {
    try {
      await this._LOCK_SAVE_CONFIG.pLock();
      await this._pSaveConfig_();
    } finally {
      this._LOCK_SAVE_CONFIG.unlock();
    }
  }
  static async ["_pSaveConfig_"]() {
    if (!UtilPrePreInit.isGM()) {
      await GameStorage.pSetClient(Config._CLIENT_SETTINGS_KEY, MiscUtil.copy(Config._CONFIG_PLAYER));
      return;
    }
    await game.settings.set(SharedConsts.MODULE_ID, Config._SETTINGS_KEY, MiscUtil.copy(Config._CONFIG));
    const _0x473106 = {
      'type': "config.update",
      'config': MiscUtil.copy(this._CONFIG)
    };
    game.socket.emit(Config._SOCKET_ID, _0x473106);
  }
  static ["_saveConfigDebounced"] = MiscUtil.throttle(Config._pSaveConfig, 0x64);
  
  static get(namespace, prop, {isIgnorePlayer = false} = {}) {
    if (Config._CONFIG_TEMP[namespace]?.[prop] !== undefined) {
      return Config._CONFIG_TEMP[namespace][prop];
    }
    if (!UtilPrePreInit.isGM() && ConfigUtilsSettings.isPlayerEditable(namespace, prop) && !isIgnorePlayer) {
      const val = (Config._CONFIG_PLAYER[namespace] || {})[prop];
      if (ConfigUtilsSettings.isNullable(namespace, prop) && val === null || val != null) {
        return this._get_getValidValue(namespace, prop, val);
      }
    }
    const out = (Config._CONFIG[namespace] || {})[prop];
    if(namespace == "import" && prop == "enrichersAutoConvert"){
      console.log("CONFIG", Config._CONFIG);
    }
    return this._get_getValidValue(namespace, prop, out);
  }
  static _get_getValidValue(namespace, prop, val) {
    const match = ConfigConsts.getDefaultConfigSortedFlat_().find(([ns]) => ns === namespace)[1][prop];
    if(!match){console.error("Could not find valid config value", namespace, prop, val);}
    if (match.type !== "enum") { return val; }
    if (match.isNullable && val == null) { return val; }
    const enumValues = ConfigUtilsSettings.getEnumValues(match);
    if (val == null || !enumValues.some(enumVal => (enumVal.value ?? enumVal) === val)) {
      return match["default"] ?? enumValues[0].value ?? enumValues[0];
    }
    return val;
  }
  static ["_getDisplayLabels"](_0x288279, _0xf85c74) {
    const _0x6262b3 = ConfigConsts.getDefaultConfig_();
    const _0x5cebfe = _0x6262b3[_0x288279]?.["name"];
    const _0x956382 = _0x6262b3[_0x288279]?.["settings"]?.[_0xf85c74]?.['name'] || _0x6262b3[_0x288279]?.['settingsAdvanced']?.[_0xf85c74]?.["name"] || _0x6262b3[_0x288279]?.['settingsHacks']?.[_0xf85c74]?.['name'];
    return {
      'displayGroup': _0x5cebfe,
      'displayKey': _0x956382
    };
  }
  static ['has'](_0x23c99c, _0x413db8) {
    return !!ConfigConsts.getDefaultConfigSortedFlat_().find(([_0x24a9a0]) => _0x24a9a0 === _0x23c99c)?.[0x1]?.[_0x413db8];
  }
  static ["getSafe"](_0x48e921, _0x55bcb1) {
    try {
      return this.get(_0x48e921, _0x55bcb1);
    } catch (_0x3f1440) {
      return undefined;
    }
  }
  static ["handleFailedInitConfigApplication"](_0x26ed85, _0x525fb9, _0x1a25c6) {
    const {
      displayGroup: _0x576794,
      displayKey: _0x1c32ad
    } = Config._getDisplayLabels(_0x26ed85, _0x525fb9);
    ui.notifications.error("Failed to apply Config \"" + _0x1c32ad + "\" -> \"" + _0x576794 + "\" during initial load! " + VeCt.STR_SEE_CONSOLE);
    if (_0x1a25c6) {
      console.error(...LGT, _0x1a25c6);
    }
  }
  static ["isUseMetricDistance"]({
    configGroup: _0x4095b3,
    configKey = "isMetricDistance"
  }) {
    return Config.get("import", "isGlobalMetricDistance") || Config.has(_0x4095b3, configKey) && Config.get(_0x4095b3, configKey);
  }
  static ["isUseMetricWeight"]({
    configGroup: _0x335df5,
    configKey = "isMetricWeight"
  }) {
    return false; //TEMPFIX
    /* if (UtilGameSettings.getSafe(game.system.id, "metricWeightUnits")) {
      return true;
    } */
    return Config.get('import', "isGlobalMetricWeight") || Config.has(_0x335df5, configKey) && Config.get(_0x335df5, configKey);
  }
  static ["getMetricNumberDistance"]({
    configGroup: _0x287496,
    originalValue: _0x2525c8,
    originalUnit: _0x15cbf9,
    configKey = "isMetricDistance",
    toFixed: _0x4780c3
  }) {
    return this._getMetricNumber({
      'configGroup': _0x287496,
      'originalValue': _0x2525c8,
      'originalUnit': _0x15cbf9,
      'configKey': configKey,
      'fnIsUse': Config.isUseMetricDistance.bind(Config),
      'toFixed': _0x4780c3
    });
  }
  static ['getMetricNumberWeight']({
    configGroup: _0x472563,
    originalValue: _0x3bcac6,
    originalUnit: _0x2715b2,
    configKey = "isMetricWeight",
    toFixed: _0x371dc8
  }) {
    return this._getMetricNumber({
      'configGroup': _0x472563,
      'originalValue': _0x3bcac6,
      'originalUnit': _0x2715b2,
      'configKey': configKey,
      'fnIsUse': Config.isUseMetricWeight.bind(Config),
      'toFixed': _0x371dc8
    });
  }
  static ["_getMetricNumber"]({
    configGroup: _0x3f59a7,
    originalValue: _0xb3e2df,
    originalUnit: _0x48ea42,
    configKey: _0x3f6086,
    fnIsUse: _0x4e4c24,
    toFixed: _0x13e977
  }) {
    if (!_0x4e4c24({
      'configGroup': _0x3f59a7,
      'configKey': _0x3f6086
    })) {
      if (_0x13e977) {
        return NumberUtil.toFixedNumber(_0xb3e2df, _0x13e977);
      }
      return _0xb3e2df;
    }
    return Parser.metric.getMetricNumber({
      'originalValue': _0xb3e2df,
      'originalUnit': _0x48ea42,
      'toFixed': _0x13e977 ?? 0x3
    });
  }
  static ['getMetricUnitDistance']({
    configGroup: _0x293bb4,
    originalUnit: _0x3ed5b6,
    configKey = "isMetricDistance",
    isShortForm = true,
    isPlural = false
  }) {
    return this._getMetricUnit({
      'configGroup': _0x293bb4,
      'originalUnit': _0x3ed5b6,
      'configKey': configKey,
      'isShortForm': isShortForm,
      'isPlural': isPlural,
      'fnIsUse': Config.isUseMetricDistance.bind(Config)
    });
  }
  static ["getMetricUnitWeight"]({
    configGroup: _0x486606,
    originalUnit: _0x50698d,
    configKey = "isMetricWeight",
    isShortForm = true,
    isPlural = false
  }) {
    return this._getMetricUnit({
      'configGroup': _0x486606,
      'originalUnit': _0x50698d,
      'configKey': configKey,
      'isShortForm': isShortForm,
      'isPlural': isPlural,
      'fnIsUse': Config.isUseMetricWeight.bind(Config)
    });
  }
  static ["_getMetricUnit"]({
    configGroup: _0x50bdc7,
    originalUnit: _0x5f0dc8,
    configKey: _0x4280fe,
    isShortForm: _0x45e3bf,
    isPlural: _0x44cab6,
    fnIsUse: _0x2933c2
  }) {
    if (!_0x2933c2({
      'configGroup': _0x50bdc7,
      'configKey': _0x4280fe
    })) {
      if (!_0x45e3bf) {
        return _0x5f0dc8;
      }
      switch (_0x5f0dc8) {
        case Parser.UNT_FEET:
          return 'ft';
        case Parser.UNT_YARDS:
          return 'yd';
        case Parser.UNT_MILES:
          return 'mi';
        default:
          return _0x5f0dc8;
      }
    }
    return Parser.metric.getMetricUnit({
      'originalUnit': _0x5f0dc8,
      'isShortForm': _0x45e3bf,
      'isPlural': _0x44cab6
    });
  }
  static ["getSpellPointsKey"]({
    actorType: _0x34101f
  }) {
    return _0x34101f === 'character' ? "spellPointsMode" : "spellPointsModeNpc";
  }
  static ["getSpellPointsResource"]({
    isValueKey = false,
    isMaxKey = false
  } = {}) {
    return this._getSpellPsiPointsResource({
      'configGroup': "importSpell",
      'configKey': "spellPointsResource",
      'configKeyCustom': "spellPointsResourceCustom",
      'isValueKey': isValueKey,
      'isMaxKey': isMaxKey
    });
  }
  static ["getPsiPointsResource"]({
    isValueKey = false,
    isMaxKey = false
  } = {}) {
    return this._getSpellPsiPointsResource({
      'configGroup': "importPsionic",
      'configKey': "psiPointsResource",
      'configKeyCustom': "psiPointsResourceCustom",
      'isValueKey': isValueKey,
      'isMaxKey': isMaxKey
    });
  }
  static ["_getSpellPsiPointsResource"]({
    configGroup: _0x5ff393,
    configKey: _0x61a78,
    configKeyCustom: _0x27b383,
    isValueKey = false,
    isMaxKey = false
  } = {}) {
    if (Config.get(_0x5ff393, _0x61a78) === ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM) {
      return ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM;
    }
    if (isValueKey && isMaxKey) {
      throw new Error("Only one of \"isValue\" and \"isMax\" may be specified!");
    }
    const _0x265e6e = Config.get(_0x5ff393, _0x61a78) === ConfigConsts.C_SPELL_POINTS_RESOURCE__ATTRIBUTE_CUSTOM ? Config.get(_0x5ff393, _0x27b383) : Config.get(_0x5ff393, _0x61a78);
    return isValueKey ? _0x265e6e + ".value" : isMaxKey ? _0x265e6e + ".max" : _0x265e6e;
  }
}
Config._SETTINGS_KEY = "config";
Config._CLIENT_SETTINGS_KEY = SharedConsts.MODULE_ID + '_config';
Config._SOCKET_ID = "module." + SharedConsts.MODULE_ID;
Config._CONFIG = {};
Config._CONFIG_PLAYER = {};
Config._CONFIG_TEMP = {};
//#endregion

//#region ConfigMigration
class _ConfigMigratorBase {
  _versionFrom;
  _versionTo;

  get versionFrom() {
      return this._versionFrom;
  }
  get versionTo() {
      return this._versionTo;
  }

  getMigratedForward({config, versionCurrent, versionTarget}) {
      if (versionCurrent !== this._versionFrom)
          return config;
      if (this._versionTo > versionTarget)
          return config;
      return this._getMigratedForward({
          config
      });
  }

  _getMigratedForward({config}) {
      throw new Error("Unimplemented!");
  }

  _mutMoveProp({config, groupSource, groupDestination, prop}) {
      if (!(prop in config[groupSource] || {}))
          return;

      (config[groupDestination] ||= {})[prop] = config[groupSource][prop];
      delete config[groupSource][prop];

      if (!Object.keys(config[groupSource]).length)
          delete config[groupSource];
  }
}

class _ConfigMigratorZeroToOne extends _ConfigMigratorBase {
  _versionFrom = 0;
  _versionTo = 1;

  _getMigratedForward({config}) {
      config = MiscUtil.copyFast(config);

      ["isLoadLocalPrereleaseIndex", "localPrereleaseDirectoryPath", "isUseLocalPrereleaseIndexJson", "localPrerelease", "isLoadLocalHomebrewIndex", "localHomebrewDirectoryPath", "isUseLocalHomebrewIndexJson", "localHomebrew", "baseSiteUrl", "isNoLocalData", "isNoPrereleaseBrewIndexes", "basePrereleaseUrl", "baseBrewUrl", ].forEach(prop=>{
          this._mutMoveProp({
              config,
              groupSource: "import",
              groupDestination: "dataSources",
              prop,
          });
      }
      );

      return config;
  }
}
class ConfigMigration {
  static _MIGRATORS = [new _ConfigMigratorZeroToOne(), ];

  static get CURRENT_VERSION() {
      return Math.max(...this._MIGRATORS.map(it=>it.versionTo));
  }

  static _IS_INIT = false;
  static _init() {
      if (this._IS_INIT)
          return;
      this._IS_INIT = true;

      const cnts = {};
      this._MIGRATORS.forEach(({versionFrom, versionTo})=>{
          cnts[versionFrom] = (cnts[versionFrom] || 0) + 1;
          cnts[versionTo] = (cnts[versionTo] || 0) + 1;
      }
      );
      if (Object.values(cnts).some(it=>it > 0))
          throw new Error(`Multiple Config migrations defined for one or more versions! This is a bug!`);
  }

  static getMigrated({config}) {
      if (!config)
          return config;

      const versionFrom = config.version ?? 0;
      const versionTarget = this.CURRENT_VERSION;

      const migrators = this._MIGRATORS.slice(versionFrom);
      if (!migrators.length)
          return config;

      let versionCurrent = versionFrom;
      for (const migrator of migrators) {
          config = migrator.getMigratedForward({
              config,
              versionCurrent,
              versionTarget
          });
          versionCurrent = migrator.versionTo;
      }

      config.version = versionCurrent;

      return config;
  }
}
//#endregion

//#region ConfigUtilSettings
class ConfigUtilsSettings {
  static getEnumValues(meta) {
      return typeof meta.values === "function" ? meta.values() : meta.values;
  }

  static getEnumValueValue(val) {
      return val.value !== undefined ? val.value : val;
  }

  static isPlayerEditable(group, key) {
      const meta = this._is_getKeyMeta(group, key);
      return !!meta?.isPlayerEditable;
  }

  static isNullable(group, key) {
      const meta = this._is_getKeyMeta(group, key);
      return !!meta?.isNullable;
  }

  static _is_getKeyMeta(groupKey, key) {
      return ConfigConsts.getDefaultConfigSortedFlat_().find(([groupKey_])=>groupKey_ === groupKey)[1][key];
  }
}

//#endregion

class CONFIG{
    static DND5E = {
        attunementTypes: {
            NONE: "none"
        }
    }
    
}
class CONST {
    //These are all from FVTT
    static USER_ROLES = {NONE : 0, PLAYER : 1, TRUSTED : 2, ASSISTANT : 3, GAMEMASTER : 4};
    static DOCUMENT_OWNERSHIP_LEVELS = {INHERIT: 0, NONE: 1, LIMITED: 2, OBSERVER: 3, OWNER: 4};
    static TOKEN_DISPOSITIONS = {SECRET: 0, HOSTILE: 1, NEUTRAL: 2, FRIENDLY: 3}
}
class foundry {
    static utils = {
        mergeObject: (original, other) => {return Object.assign(original, other);}
    }
}