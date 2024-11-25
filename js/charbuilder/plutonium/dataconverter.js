class DataConverter {
	static _configGroup;

	static _SideDataInterface;
	static _ImageFetcher;

	static async pGetDocumentJson (ent, opts) { throw new Error("Unimplemented!"); }

	static isStubEntity (ent) { return false; }

	static getTagUids (tag, str) {
		const re = new RegExp(`{@${tag} ([^}]+)}`, "gi");
		const out = [];
		str.replace(re, (...m) => out.push(m[1]));
		return out;
	}

	static getCombinedFoundrySystem (foundrySystem, _foundryData) {
		if (!_foundryData && !foundrySystem) return {};

		const combinedFoundrySystem = MiscUtil.copyFast(_foundryData || {});
		Object.assign(combinedFoundrySystem, MiscUtil.copyFast(foundrySystem || {}));

		return combinedFoundrySystem;
	}

	static getCombinedFoundryFlags (foundryFlags, _foundryFlags) {
		if (!foundryFlags && !_foundryFlags) return {};

		const combinedFoundryFlags = MiscUtil.copyFast(_foundryFlags || {});

		foundry.utils.mergeObject(combinedFoundryFlags, MiscUtil.copyFast(foundryFlags || {}));

		return combinedFoundryFlags;
	}

	static async pGetEntryDescription (entry, opts) {
		opts = opts || {};
		opts.prop = opts.prop || "entries";

		if (!entry[opts.prop]) return "";

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		let cpyEntries = MiscUtil.copyFast(entry[opts.prop]);
		cpyEntries = UtilDataConverter.WALKER_GENERIC.walk(
			cpyEntries,
			{
				string: (str) => {
					return str
												.replace(/{@hitYourSpellAttack}/gi, () => `{@dice 1d20 + @${SharedConsts.MODULE_ID_FAKE}.userchar.spellAttackRanged|your spell attack modifier}`)
						.replace(/{(@dice|@damage|@scaledice|@scaledamage|@hit) ([^}]+)}/gi, (...m) => {
							const [, tag, text] = m;
							let [rollText, displayText, name, ...others] = Renderer.splitTagByPipe(text);
							const originalRollText = rollText;

							rollText = this._pGetEntryDescription_getCleanDicePart(rollText, opts);
							displayText = this._pGetEntryDescription_getCleanDisplayPart({displayText, originalText: originalRollText, text: rollText});

							return `{${tag} ${[rollText, displayText || "", name || "", ...others].join("|").replace(/\|+$/, "")}}`;
						})
						.replace(/{(@dc) ([^}]+)}/gi, (...m) => {
							const [, tag, text] = m;
							let [dcText, displayText] = Renderer.splitTagByPipe(text);
							const originalDcText = dcText;

							dcText = this._pGetEntryDescription_getCleanDicePart(dcText, opts);
							displayText = this._pGetEntryDescription_getCleanDisplayPart({displayText, originalText: originalDcText, text: dcText});

							return `{${tag} ${[dcText, displayText || ""].join("|").replace(/\|+$/, "")}}`;
						})
					;
				},
			},
		);

		return DescriptionRenderer.pGetWithDescriptionPlugins(
			() => Renderer.get().setFirstSection(true).render(
				{
					type: "entries",
					entries: cpyEntries,
				},
				opts.depth != null ? opts.depth : 2,
			),
		);
	}

	static _pGetEntryDescription_getCleanDicePart (str, opts) {
		return str
						.replace(/\bPB\b/gi, `@${SharedConsts.MODULE_ID_FAKE}.userchar.pb`)
						.replace(/\bsummonSpellLevel\b/gi, `${opts.summonSpellLevel ?? 0}`);
	}

	static _pGetEntryDescription_getCleanDisplayPart ({displayText, originalText, text}) {
				if (!displayText && originalText !== text) {
			displayText = originalText
								.replace(/\bsummonSpellLevel\b/gi, `the spell's level`);
		}
		return displayText;
	}

 /**
  * @param {any} actor
  * @param {{system:any}} actorUpdate
  * @param {any} entry
  * @param {sideData:any} opts
  * @returns {any}
  */
	static mutActorUpdate (actor, actorUpdate, entry, opts) {
		opts = opts || {};

		this._mutActorUpdate_mutFromSideDataMod(actor, actorUpdate, opts);
		this._mutActorUpdate_mutFromSideTokenMod(actor, actorUpdate, opts);
	}

	static _mutActorUpdate_mutFromSideDataMod (actor, actorUpdate, opts) {
		return this._mutActorUpdate_mutFromSideMod(actor, actorUpdate, opts, "actorDataMod", "data");
	}

 /**
  * @param {any} actor
  * @param {any} actorUpdate
  * @param {{sideData:{actorTokenMod:any}}} opts
  * @returns {any}
  */
	static _mutActorUpdate_mutFromSideTokenMod (actor, actorUpdate, opts) {
		return this._mutActorUpdate_mutFromSideMod(actor, actorUpdate, opts, "actorTokenMod", "token");
	}

 /**
  * @param {any} actor
  * @param {{system:any}} actorUpdate
  * @param {{sideData:any}} opts
  * @param {string} sideProp
  * @param {string} actorProp
  * @returns {any}
  */
	static _mutActorUpdate_mutFromSideMod (actor, actorUpdate, opts, sideProp, actorProp) {
		if (!opts.sideData || !opts.sideData[sideProp]) return;

		Object.entries(opts.sideData[sideProp])
			//Path is the name of the entry, modMetas is the entry itself
			.forEach(([path, modMetas]) => this._mutActorUpdate_mutFromSideMod_handleProp(actor, actorUpdate, opts, sideProp, actorProp, path, modMetas));
	}

 /**
  * @param {any} actor
  * @param {{system:any}} actorUpdate
  * @param {{sideData:any}} opts
  * @param {string} sideProp
  * @param {string} actorProp
  * @param {string} path
  * @param {{mode:string, conditionals:any[]}[]} modMetas
  */
	static _mutActorUpdate_mutFromSideMod_handleProp (actor, actorUpdate, opts, sideProp, actorProp, path, modMetas) {
		const pathParts = path.split(".");

		//If path is just a single underscore, look for conditionals only
		if (path === "_") {
			modMetas.forEach(modMeta => {
				switch (modMeta.mode) {
					case "conditionals": {
						for (const cond of modMeta.conditionals) {
														
							window.PLUT_CONTEXT = {actor};

							if (cond.condition && !eval(cond.condition)) continue;

							Object.entries(cond.mod)
								.forEach(([path, modMetas]) => this._mutActorUpdate_mutFromSideMod_handleProp(actor, actorUpdate, opts, sideProp, actorProp, path, modMetas));

							break;
						}

						break;
					}

					default: throw new Error(`Unhandled mode "${modMeta.mode}"`);
				}
			});
			return;
		}

		
		const fromActor = MiscUtil.get(actor, "system", actorProp, ...pathParts);
		const fromUpdate = MiscUtil.get(actorUpdate, actorProp, ...pathParts);
		const existing = fromUpdate || fromActor;

		modMetas.forEach(modMeta => {
			switch (modMeta.mode) {
				case "appendStr": {
					const existing = MiscUtil.get(actorUpdate, actorProp, ...pathParts);
					const next = existing ? `${existing}${modMeta.joiner || ""}${modMeta.str}` : modMeta.str;
					MiscUtil.set(actorUpdate, actorProp, ...pathParts, next);
					break;
				}

				case "appendIfNotExistsArr": {
					const existingArr = MiscUtil.copyFast(existing || []);
					const out = [...existingArr];
					out.push(...modMeta.items.filter(it => !existingArr.some(x => CollectionUtil.deepEquals(it, x))));
					MiscUtil.set(actorUpdate, actorProp, ...pathParts, out);
					break;
				}

				case "scalarAdd": {
					MiscUtil.set(actorUpdate, actorProp, ...pathParts, modMeta.scalar + existing || 0);
					break;
				}

				case "scalarAddUnit": {
					const existingLower = `${existing || 0}`.toLowerCase();

					const handle = (toFind) => {
						const ix = existingLower.indexOf(toFind.toLowerCase());
						let numPart = existing.slice(0, ix);
						const rest = existing.slice(ix);
						const isSep = numPart.endsWith(" ");
						numPart = numPart.trim();

						if (!isNaN(numPart)) {
							const out = `${modMeta.scalar + Number(numPart)}${isSep ? " " : ""}${rest}`;
							MiscUtil.set(actorUpdate, actorProp, ...pathParts, out);
						} 					};

					if (!existing) MiscUtil.set(actorUpdate, actorProp, ...pathParts, `${modMeta.scalar} ${modMeta.unitShort || modMeta.unit}`);
					else if (modMeta.unit && existingLower.includes(modMeta.unit.toLowerCase())) {
						handle(modMeta.unit);
					} else if (modMeta.unitShort && existingLower.includes(modMeta.unitShort.toLowerCase())) {
						handle(modMeta.unitShort);
					} 					break;
				}

				case "setMax": {
					const existingLower = `${existing || 0}`.toLowerCase();
					let asNum = Number(existingLower);
					if (isNaN(asNum)) asNum = 0;
					const maxValue = Math.max(asNum, modMeta.value);
					MiscUtil.set(actorUpdate, actorProp, ...pathParts, maxValue);
					break;
				}

				case "set": {
					MiscUtil.set(actorUpdate, actorProp, ...pathParts, MiscUtil.copyFast(modMeta.value));
					break;
				}

				default: throw new Error(`Unhandled mode "${modMeta.mode}"`);
			}
		});
	}

	static _getProfBonusExpressionParts (str) {
														const parts = str.split(/([-+]\s*[^-+]+)/g).map(it => it.trim().replace(/\s*/g, "")).filter(Boolean);

		const [partsNumerical, partsNonNumerical] = parts.segregate(it => !isNaN(it));

		const totalNumerical = partsNumerical.map(it => Number(it)).sum();

		return {partsNumerical, partsNonNumerical, totalNumerical};
	}

	static _PassiveEntryParseState = class {
		constructor ({entry, img, name}, opts) {
			this._entry = entry;
			this._opts = opts;

			this.name = name;
			this.img = img;

						let {
				id,

				description,

				activationType,
				activationCost,
				activationCondition,

				saveAbility,
				saveDc,
				saveScaling,

				damageParts,

				attackBonus,
				isAttackFlat,

				requirements,

				prerequisitesLevel,

				actionType,

				durationValue,
				durationUnits,

				consumeType,
				consumeTarget,
				consumeAmount,
				consumeScale,

				formula,

				targetValue,
				targetUnits,
				targetType,
				targetPrompt,

				rangeShort,
				rangeLong,
				rangeUnits,

				ability,

				usesValue,
				usesMax,
				usesPer,

				rechargeValue,

				isProficient,

				typeType,
				typeSubtype,

				properties,

				foundrySystem,
				_foundryData,
				foundryFlags,
				_foundryFlags,
			} = opts;

			this.combinedFoundrySystem = DataConverter.getCombinedFoundrySystem(foundrySystem, _foundryData);
			this.combinedFoundryFlags = DataConverter.getCombinedFoundryFlags(foundryFlags, _foundryFlags);

			if (entry._foundryId && id && entry._foundryId !== id) throw new Error(`Item given two different IDs (${this.id} and ${id})! This is a bug!`);

			this.id = entry._foundryId || id || foundry.utils.randomID();

			this.description = description;

			this.activationType = activationType;
			this.activationCost = activationCost;
			this.activationCondition = activationCondition;

			this.saveAbility = saveAbility;
			this.saveDc = saveDc;
			this.saveScaling = saveScaling;

			this.damageParts = damageParts;

			this.attackBonus = attackBonus;
			this.isAttackFlat = isAttackFlat;

			this.requirements = requirements;

			this.prerequisitesLevel = prerequisitesLevel;

			this.actionType = actionType;

			this.durationValue = durationValue;
			this.durationUnits = durationUnits;

			this.consumeType = consumeType;
			this.consumeTarget = consumeTarget;
			this.consumeAmount = consumeAmount;
			this.consumeScale = consumeScale;

			this.formula = formula;

			this.targetValue = targetValue;
			this.targetUnits = targetUnits;
			this.targetType = targetType;
			this.targetPrompt = targetPrompt;

			this.rangeShort = rangeShort;
			this.rangeLong = rangeLong;
			this.rangeUnits = rangeUnits;

			this.ability = ability;

			this.usesValue = usesValue; 			this.usesMax = usesMax; 			this.usesPer = usesPer;

			this.rechargeValue = rechargeValue;

			this.isProficient = isProficient;

			this.typeType = typeType;
			this.typeSubtype = typeSubtype;

			this.properties = properties;
			
						this.effectsParsed = [];

						this.flagsParsed = {};
		}

		async pInit ({isSkipDescription = false, isSkipImg = false} = {}) {
			if (!isSkipDescription && !this.description && !this._opts.isSkipDescription) {
				this.description = await DataConverter.pGetEntryDescription(this._entry, {depth: this._opts.renderDepth, summonSpellLevel: this._opts.summonSpellLevel});
			}

			if (!isSkipImg && this._opts.img) {
				this.img = await Vetools.pOptionallySaveImageToServerAndGetUrl(this._opts.img);
			}
		}
	};

		static async _pGetItemActorPassive (entry, opts) {
		opts = opts || {};

		if (opts.additionalSystem && opts.pFnGetAdditionalSystem) throw new Error(`Arguments "additionalSystem" and "pFnGetAdditionalSystem" are mutually exclusive!`);

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		opts.modeOptions = opts.modeOptions || {};

				if (opts.mode === "object") opts.mode = "creature";

		const state = new this._PassiveEntryParseState(
			{
				entry,
				name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(entry, {displayName: opts.displayName, isActorItem: opts.isActorItem ?? true})),
			},
			opts,
		);
		await state.pInit();

		const strEntries = entry.entries ? JSON.stringify(entry.entries) : null;

		this._pGetItemActorPassive_mutRecharge({entry, opts, state});
		this._pGetItemActorPassive_mutActivation({entry, opts, state});
		this._pGetItemActorPassive_mutUses({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutSave({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutDuration({entry, opts, state});
		this._pGetItemActorPassive_mutDamageAndFormula({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutTarget({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutActionType({entry, opts, state});
		this._pGetItemActorPassive_mutProperties({entry, opts, state});
		this._pGetItemActorPassive_mutEffects({entry, opts, state});

				try { state.activationCondition = Renderer.stripTags(state.activationCondition); } catch (e) { console.error(...LGT, e); }

		state.name = state.name.trim().replace(/\s+/g, " ");
		if (!state.name) state.name = "(Unnamed)"; 
		const fauxEntrySourcePage = {...entry};
		if (opts.source != null) fauxEntrySourcePage.source = opts.source;
		if (opts.page != null) fauxEntrySourcePage.page = opts.page;

		this._pGetItemActorPassive_mutFlags({entry, opts, state});

		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: opts.translationData,
			name: state.name,
			description: state.description,
		});

		const systemBase = {
			source: opts.fvttSource !== undefined
				? opts.fvttSource
				: UtilDocumentSource.getSourceObjectFromEntity(fauxEntrySourcePage),
			description: {value: translatedDescription, chat: ""},

			damage: {
				parts: state.damageParts ?? [],
				versatile: "",
			},
			duration: {
				value: state.durationValue,
				units: state.durationUnits,
			},
			range: {
				value: state.rangeShort,
				long: state.rangeLong,
				units: state.rangeUnits || ((state.rangeShort != null || state.rangeLong != null) ? "ft" : ""),
			},
			proficient: state.isProficient,
			requirements: state.requirements,

			...state.prerequisitesLevel != null
				? {
					prerequisites: {
						level: state.prerequisitesLevel,
					},
				}
				: {},

			save: {
				ability: state.saveAbility,
				dc: state.saveDc,
				scaling: state.saveScaling || "flat",
			},

			activation: {
				type: state.activationType,
				cost: state.activationCost,
				condition: state.activationCondition,
			},

			target: {
				value: state.targetValue,
				units: state.targetUnits,
				type: state.targetType,
				prompt: state.targetPrompt,
			},

			uses: {
				value: state.usesValue,
				max: state.usesMax,
				per: state.usesPer,
			},
			ability: state.ability,
			actionType: state.actionType,
			attack: {
				bonus: state.attackBonus,
				flat: state.isAttackFlat,
			},
			chatFlavor: "",
			critical: {threshold: null, damage: ""},

			formula: state.formula,

			recharge: {
				value: state.rechargeValue,
				charged: state.rechargeValue != null,
			},

			consume: {
				type: state.consumeType,
				target: state.consumeTarget,
				amount: state.consumeAmount,
				scale: state.consumeScale,
			},

			type: {
				value: state.typeType,
				subtype: state.typeSubtype,
			},

			properties: state.properties,

			...(state.combinedFoundrySystem || {}),
		};

		const additionalSystem = opts.additionalSystem
			|| (opts.pFnGetAdditionalSystem ? await opts.pFnGetAdditionalSystem(entry, {systemBase}) : null);

		const out = {
			...UtilFoundryId.getIdObj({id: state.id}),
			name: translatedName,
			type: opts.fvttType || "feat",
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			ownership: {default: 0},
			img: state.img,
			flags: {
				...translatedFlags,
				...state.flagsParsed,
				...(UtilCompat.getFeatureFlags({
					isReaction: ["reaction", "reactiondamage", "reactionmanual"]
						.includes(foundry.utils.getProperty(systemBase, ".activation.type")),
				})),
				...(state.combinedFoundryFlags || {}),
				...opts.additionalFlags,
			},
			effects: UtilActiveEffects.getEffectsMutDedupeId([
				...(opts.effects || []),
				...state.effectsParsed,
			]),
		};

				if (
			!foundry.utils.getProperty(out, "system.activation.type")
			&& (
				foundry.utils.getProperty(out, "system.uses.per")
				|| foundry.utils.getProperty(out, "system.consume.type")
			)
		) foundry.utils.setProperty(out, "system.activation.type", "special");
		
		return out;
	}

	static _pGetItemActorPassive_mutRecharge ({entry, opts, state}) {
		if (!state.name) return;

		const rechargeMeta = UtilEntityGeneric.getRechargeMeta(state.name);
		if (rechargeMeta == null) return;

		state.name = rechargeMeta.name;
		if (state.rechargeValue === undefined && rechargeMeta.rechargeValue != null) state.rechargeValue = rechargeMeta.rechargeValue;
	}

	static _pGetItemActorPassive_mutActivation ({entry, opts, state}) {
		this._pGetItemActorPassive_mutActivation_player({entry, opts, state});
		this._pGetItemActorPassive_mutActivation_creature({entry, opts, state});
	}

	static _pGetItemActorPassive_mutActivation_player ({entry, opts, state}) {
		if (opts.mode !== "player" || !entry.entries?.length) return;

		if (state.activationType || state.activationCost) {
			this._pGetItemActorPassive_mutActivation_playerCompat({entry, opts, state});
			return;
		}

		let isAction = false;
		let isBonusAction = false;
		let isReaction = false;

		UtilDataConverter.WALKER_READONLY_GENERIC.walk(
			entry.entries,
			{
				string: (str) => {
					if (state.activationType) return str;

					const sentences = Util.getSentences(str);
					for (const sentence of sentences) {
						if (/\b(?:as an action|can take an action|can use your action)\b/i.test(sentence)) {
							isAction = true;
							break;
						}

						if (/\bbonus action\b/i.test(sentence)) {
							isBonusAction = true;
							break;
						}

						const mReact = /\b(?:your reaction|this special reaction|as a reaction)\b/i.exec(sentence);
						if (mReact) {
							isReaction = true;

																					let preceding = sentence.slice(0, mReact.index).trim().replace(/,$/, "");
							const mCondition = /(^|\W)(?:if|when)(?:|\W)/i.exec(preceding);
							if (mCondition) {
								preceding = preceding.slice(mCondition.index + mCondition[1].length).trim();
								state.activationCondition = state.activationCondition || preceding;
							}

							break;
						}
					}
				},
			},
		);

						if (isAction) state.activationType = "action";
		else if (isBonusAction) state.activationType = "bonus";
		else if (isReaction) state.activationType = "reaction";

		if (state.activationType) state.activationCost = 1;

				if (!state.activationType) {
			UtilDataConverter.WALKER_READONLY_GENERIC.walk(
				entry.entries,
				{
					string: (str) => {
						if (state.activationType) return str;

						const sentences = Util.getSentences(str);

						for (const sentence of sentences) {
							if (/you can't use this feature again|once you use this feature/i.test(sentence)) state.activationType = "special";
						}
					},
				},
			);
		}

		this._pGetItemActorPassive_mutActivation_playerCompat({entry, opts, state});
	}

	static _pGetItemActorPassive_mutActivation_creature ({entry, opts, state}) {
		if (opts.mode !== "creature" || !entry.entries?.length || !entry.name) {
			this._pGetItemActorPassive_mutActivation_creature_enableOtherFields({entry, opts, state});
			return;
		}

		if (state.activationType || state.activationCost) {
			this._pGetItemActorPassive_mutActivation_creatureCompat({entry, opts, state});
			this._pGetItemActorPassive_mutActivation_creature_enableOtherFields({entry, opts, state});
			return;
		}

		MiscUtil.getWalker({
			isNoModification: true,
			keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
			isBreakOnReturn: true,
		}).walk(
			entry.entries,
			{
				string: str => {
					if (/\bbonus action\b/i.test(str)) {
						state.activationType = "bonus";
						state.activationCost = 1;
						return true;
					}
				},
			},
		);

		if (/^legendary resistance/i.test(entry.name)) {
			state.activationType = "special";
		}

		this._pGetItemActorPassive_mutActivation_creature_enableOtherFields({entry, opts, state});

		this._pGetItemActorPassive_mutActivation_creatureCompat({entry, opts, state});
	}

	static _pGetItemActorPassive_mutActivation_creature_enableOtherFields ({entry, opts, state}) {
		if (state.rechargeValue !== undefined) {
			if (state.activationType == null) state.activationType = "special";
		}
	}

	static _pGetItemActorPassive_mutActivation_playerCompat ({entry, opts, state}) {
		if (!UtilCompat.isMidiQolActive() || state.activationType !== "reaction") return null;

					}

	static _pGetItemActorPassive_mutActivation_creatureCompat ({entry, opts, state}) {
		if (!UtilCompat.isMidiQolActive() || state.activationType !== "reaction") return;

				state.activationType = "reactionmanual";

				let firstEntry = entry.entries[0];
		if (typeof firstEntry !== "string") return;

		firstEntry
						.replace(/\bcauses the attack to miss\b/i, () => {
				state.activationType = "reaction";
				return "";
			})

			.replace(/\badds? (?<ac>\d+) to (its|their|his|her) AC\b/i, (...m) => {
				const argsDuration = UtilCompat.isDaeActive()
					? {flags: {[UtilCompat.MODULE_DAE]: {specialDuration: ["1Reaction"]}}}
					: {durationTurns: 1};

				state.effectsParsed.push(UtilActiveEffects.getGenericEffect({
					...argsDuration,
					key: `system.attributes.ac.bonus`,
					value: UiUtil.intToBonus(Number(m.last().ac)),
					mode: CONST.ACTIVE_EFFECT_MODES.ADD,
					name: `${entry.name}`,
					icon: state.img,
					disabled: false,
					transfer: false,
					priority: UtilActiveEffects.PRIORITY_BONUS,
				}));

				state.targetType = state.targetType || "self";

				return "";
			})

			.replace(/\battack that would (?:hit|miss) (?:it|them|him|her|or miss)\b/i, () => {
				state.activationType = "reaction";
				return "";
			})
			.replace(/\bin response to being (?:hit|missed)\b/i, () => {
				state.activationType = "reaction";
				return "";
			})

			.replace(/\bafter taking damage from\b/i, () => {
				state.activationType = "reactiondamage";
				return "";
			})
			.replace(/\bIf [^.!?:]+ takes damage(?:,| while it)\b/i, () => {
				state.activationType = "reactiondamage";
				return "";
			})
			.replace(/\bIn response to taking damage\b/i, () => {
				state.activationType = "reactiondamage";
				return "";
			})
		;
	}

	static _pGetItemActorPassive_mutSave ({entry, opts, strEntries, state}) {
		this._pGetItemActorPassive_mutSave_player({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutSave_creature({entry, opts, strEntries, state});
	}

	static _pGetItemActorPassive_mutSave_player ({entry, opts, strEntries, state}) {
		if (opts.mode !== "player" || !entry.entries?.length) return;

		UtilDataConverter.WALKER_READONLY_GENERIC.walk(
			entry.entries,
			{
				object: (obj) => {
					if (obj.type !== "abilityDc") return obj;

					if (state.actionType && state.saveScaling) return obj;

					state.actionType = state.actionType || "save";
					state.saveScaling = obj.attributes[0]; 
					return obj;
				},
				string: (str) => {
					if (state.actionType && state.saveAbility && state.saveScaling) return str;

										str.replace(/8\s*\+\s*your proficiency bonus\s*\+\s*your (.*?) modifier/i, (...m) => {
						const customAbilities = [];
						m[1].replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i, (...m2) => {
							customAbilities.push(m2[1].toLowerCase().slice(0, 3));
						});
						if (!customAbilities.length) return;

						state.actionType = state.actionType || "save";
						state.saveScaling = customAbilities[0]; 					});
					
																				str.replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw against your (.*? )spell save DC/i, (...m) => {
						state.actionType = state.actionType || "save";
						state.saveAbility = state.saveAbility || m[1].toLowerCase().slice(0, 3);
						state.saveScaling = state.saveScaling || "spell";
					});
					
					str.replace(/(?:make a|succeed on a) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/gi, (...m) => {
						state.actionType = state.actionType || "save";
						state.saveAbility = state.saveAbility || m[1].toLowerCase().slice(0, 3);
						state.saveScaling = state.saveScaling || "spell";
					});

					return str;
				},
			},
		);
	}

	static _pGetItemActorPassive_mutSave_creature ({entry, opts, strEntries, state}) {
		if (opts.mode !== "creature" || !entry.entries?.length) return;

				const m = /{@dc (?<save>[^|}]+)(?:\|[^}]+)?}\s+(?<abil>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i.exec(strEntries);
		if (!m) return;

		const {partsNonNumerical, totalNumerical} = this._getProfBonusExpressionParts(m.groups.save);

		state.actionType = state.actionType === undefined
			? "save"
			: state.actionType;
		state.saveAbility = state.saveAbility === undefined
			? m.groups.abil.toLowerCase().slice(0, 3)
			: state.saveAbility;
		state.saveDc = state.saveDc === undefined
			? totalNumerical 			: state.saveDc;

		if (
			partsNonNumerical.length
			|| opts.pb == null
			|| (
				(
					opts.entity == null || Parser.ABIL_ABVS.some(ab => opts.entity[ab] == null || typeof opts.entity[ab] !== "number")
				)
				&& (
					opts.entity != null
					|| Parser.ABIL_ABVS.some(ab => {
						const abNamespaced = UtilEntityCreatureFeature.getNamespacedProp(ab);
						return entry[abNamespaced] == null || typeof entry[abNamespaced] !== "number";
					})
				)
			)
		) {
			state.saveScaling = state.saveScaling === undefined ? "flat" : state.saveScaling;
			return;
		}

						if (state.saveScaling) return;

						const fromAbil = state.saveDc - opts.pb - 8;
		const abilToBonus = Parser.ABIL_ABVS.map(ab => ({
			ability: ab,
			bonus: Parser.getAbilityModNumber(
				opts.entity != null
					? Renderer.monster.getSafeAbilityScore(opts.entity, ab, {isDefaultTen: true})
					: Renderer.monster.getSafeAbilityScore(entry, UtilEntityCreatureFeature.getNamespacedProp(ab), {isDefaultTen: true}),
			),
		}));
		const matchingAbils = abilToBonus.filter(it => it.bonus === fromAbil);

		if (matchingAbils.length === 1) state.saveScaling = state.saveScaling || matchingAbils[0].ability;
		else state.saveScaling = "flat";
			}

	static _pGetItemActorPassive_mutUses ({entry, opts, strEntries, state}) {
		this._pGetItemActorPassive_mutUses_creature({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutUses_player({entry, opts, strEntries, state});
	}

	static _pGetItemActorPassive_mutUses_creature ({entry, opts, strEntries, state}) {
				if (opts.mode !== "creature" || !entry.name) return;

				const isLegendary = /legendary resistance/gi.test(state.name);

		let isFound = false;

		state.name = state.name
			.replace(/\(Recharges after a (?<restPart>[^)]+)\)/i, (...m) => {
				isFound = true;

				if (isLegendary) return "";

				if (state.usesValue === undefined) state.usesValue = 1;
				if (state.usesMax === undefined) state.usesMax = `${state.usesValue}`;

				const restPartClean = m.last().restPart.toLowerCase();
				if (/\bshort\b/.test(restPartClean)) {
					if (state.usesPer === undefined) state.usesPer = "sr";
				} else if (/\blong\b/.test(restPartClean)) {
					if (state.usesPer === undefined) state.usesPer = "lr";
				}

				return "";
			});

		if (state.usesPer === undefined) {
			state.name = state.name.replace(/\(\s*(\d+)\s*\/\s*(Day|Short Rest|Long Rest)\s*\)/i, (...m) => {
				isFound = true;

				if (isLegendary) return "";

				if (state.usesValue === undefined) state.usesValue = Number(m[1]);
				if (state.usesMax === undefined) state.usesMax = `${state.usesValue}`;

				if (state.usesPer === undefined) {
					const cleanTime = m[2].trim().toLowerCase();
					switch (cleanTime) {
						case "day": state.usesPer = "day"; break;
						case "short rest": state.usesPer = "sr"; break;
						case "long rest": state.usesPer = "lr"; break;
					}
				}

				return "";
			});
		}

		if (state.usesPer === undefined) {
			state.name = state.name.replace(/\(\s*(\d+)\s+Charges\s*\)/i, (...m) => {
				isFound = true;

				if (isLegendary) return "";

				if (state.usesValue === undefined) state.usesValue = Number(m[1]);
				if (state.usesMax === undefined) state.usesMax = `${state.usesValue}`;
				if (state.usesPer === undefined) state.usesPer = "charges";

				return "";
			});
		}

		if (!isFound) return;

				state.name = state.name.trim().replace(/ +/g, " ");

				if (state.activationType === undefined) state.activationType = state.activationType || "none";

				if (entry.entries && typeof entry.entries[0] === "string" && /^(?:If |When )/i.test(entry.entries[0].trim())) {
			if (state.activationCondition === undefined) state.activationCondition = entry.entries[0].trim();
		}
	}

	static _pGetItemActorPassive_mutUses_player ({entry, opts, strEntries, state}) {
		if (opts.mode !== "player" || !entry.entries) return;

				if (state.consumeType === "charges") return;

				const isShortRest = /\b(?:finish|complete) a short rest\b/.test(strEntries) || /\b(?:finish|complete) a short or long rest\b/.test(strEntries) || /\b(?:finish|complete) a short rest or a long rest\b/.test(strEntries) || /\b(?:finish|complete) a short or long rest\b/.test(strEntries);
		const isLongRest = !isShortRest && /\b(?:finish|complete) a long rest\b/.test(strEntries);

		if (state.usesPer === undefined) {
			if (isShortRest) state.usesPer = "sr";
			else if (isLongRest) state.usesPer = "lr";
		}
		
				const mAbilModifier = new RegExp(`a number of times equal to(?: (${Consts.TERMS_COUNT.map(it => it.tokens.join("")).join("|")}))? your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier(?: \\(minimum of (${Consts.TERMS_COUNT.map(it => it.tokens.join("")).join("|")})\\))?`, "i").exec(strEntries);
		if (mAbilModifier && opts.actor) {
			const abv = mAbilModifier[2].slice(0, 3).toLowerCase();
			const abilScore = MiscUtil.get(opts.actor, "system", "abilities", abv, "value");
			if (abilScore != null) {
				let mod = Parser.getAbilityModNumber(abilScore);
												let modFormula = `floor((@abilities.${abv}.value - 10) / 2)`;

				if (mAbilModifier[1]) {
					const multiplier = (Consts.TERMS_COUNT.find(it => it.tokens.join(" ") === mAbilModifier[1].trim().toLowerCase()) || {}).count || 1;
					mod = mod * multiplier;
					modFormula = `${modFormula} * ${multiplier}`;
				}

				if (mAbilModifier[3]) {
					const min = (Consts.TERMS_COUNT.find(it => it.tokens.join("") === mAbilModifier[3].trim().toLowerCase()) || {}).count || 1;
					mod = Math.max(min, mod);
					modFormula = `max(${min}, ${modFormula})`;
				}

				if (state.usesValue === undefined) state.usesValue = mod;
				if (state.usesMax === undefined) state.usesMax = modFormula;
			}
		}

		strEntries.replace(/(you can ([^.!?]+)) a number of times equal to(?<mult> twice)? your proficiency bonus/i, (...m) => {
			const mult = m.last().mult
				? (Consts.TERMS_COUNT.find(meta => CollectionUtil.deepEquals(meta.tokens, m.last().mult.trim().toLowerCase().split(/( )/g)))?.count || 1)
				: 1;
			if (state.usesValue === undefined) state.usesValue = opts.actor ? (UtilActors.getProficiencyBonusNumber({actor: opts.actor}) * mult) : null;
			if (state.usesMax === undefined) state.usesMax = `@prof${mult > 1 ? ` * ${mult}` : ""}`;
		});

		strEntries.replace(/you can use this (?:feature|ability) (?<mult>once|twice|[a-zA-Z]+ times)/i, (...m) => {
			const mult = (Consts.TERMS_COUNT.find(meta => CollectionUtil.deepEquals(meta.tokens, m.last().mult.trim().toLowerCase().split(/( )/g)))?.count || 1);
			if (state.usesValue === undefined) state.usesValue = mult;
			if (state.usesMax === undefined) state.usesMax = mult;
		});

				if (state.usesPer && !state.usesValue && (!state.usesMax || state.usesMax === "0")) {
			if (state.usesValue === undefined) state.usesValue = 1;
			if (state.usesMax === undefined) state.usesMax = `${state.usesValue}`;
		}
			}

	static _pGetItemActorPassive_mutDuration ({entry, opts, state}) {
		this._pGetItemActorPassive_mutDuration_creature({entry, opts, state});
		this._pGetItemActorPassive_mutDuration_player({entry, opts, state});
	}

	static _pGetItemActorPassive_mutDuration_creature ({entry, opts, state}) {
		if (opts.mode !== "creature" || !entry.entries) return;

				return "stubbed";
	}

	static _pGetItemActorPassive_mutDuration_player ({entry, opts, state}) {
		if (opts.mode !== "player" || !entry.entries) return;

		UtilDataConverter.WALKER_READONLY_GENERIC.walk(
			entry.entries,
			{
				string: (str) => {
										if (state.durationValue || state.durationUnits) return;

															str.replace(/(?:^|\W)lasts for (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m) => {
						state.durationValue = Number(m[1]);
						state.durationUnits = m[2].toLowerCase();
					});

										str.replace(/(?:^|\W)for the next (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m) => {
						state.durationValue = Number(m[1]);
						state.durationUnits = m[2].toLowerCase();
					});

										str.replace(/(?:^|\W)turned for (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m) => {
						state.durationValue = Number(m[1]);
						state.durationUnits = m[2].toLowerCase();
					});

										str.replace(/(?:^|\W)this effect lasts for (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m) => {
						state.durationValue = Number(m[1]);
						state.durationUnits = m[2].toLowerCase();
					});

										str.replace(/(?:^|\W)until the end of your next turn(?:\W|$)/gi, () => {
						state.durationValue = 1;
						state.durationUnits = "turn";
					});

										Renderer.stripTags(str).replace(/(?:^|\W)is \w+ by you for (\d+) (minute|hour|day|month|year|turn|round)s(?:\W|$)/gi, (...m) => {
						state.durationValue = Number(m[1]);
						state.durationUnits = m[2].toLowerCase();
					});
				},
			},
		);
	}

	static _pGetItemActorPassive_getTargetMeta ({opts, strEntries}) {
		let targetValue, targetUnits, targetType;
		let found = false;

		let tmpEntries = strEntries
						.replace(/exhales [^.]*a (?<size>\d+)-foot[- ](?<shape>cone|line)/, (...m) => {
				targetValue = Number(m.last().size);
				targetUnits = "ft";
				targetType = m.last().shape; 
				found = true;

				return "";
			});

		if (found) return this._pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType});

				tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot-radius,? \d+-foot-tall cylinder/, (...m) => {
			targetValue = Number(m.last().size);
			targetUnits = "ft";
			targetType = "cylinder";

			found = true;
			return "";
		});

		if (found) return this._pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType});

								tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot[- ]radius(?<ptSphere> sphere)?/, (...m) => {
			targetValue = Number(m.last().size);
			targetUnits = "ft";
			targetType = (m.last().ptSphere ? "sphere" : "radius");

			found = true;
			return "";
		});

		if (found) return this._pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType});

				tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot[- ]cube/, (...m) => {
			targetValue = Number(m.last().size);
			targetUnits = "ft";
			targetType = "cube";

			found = true;
			return "";
		});

		if (found) return this._pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType});

				tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot[- ]square/, (...m) => {
			targetValue = Number(m.last().size);
			targetUnits = "ft";
			targetType = "square";

			found = true;
			return "";
		});

		if (found) return this._pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType});

				tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot line/, (...m) => {
			targetValue = Number(m.last().size);
			targetUnits = "ft";
			targetType = "line";

			found = true;
			return "";
		});

				tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot cone/, (...m) => {
			targetValue = Number(m.last().size);
			targetUnits = "ft";
			targetType = "cone";

			found = true;
			return "";
		});

		if (opts.fvttType === "weapon") {
			const targetMeta = this._getWeaponTargetDataDefault();
			targetValue = targetMeta.value;
			targetUnits = targetMeta.units;
			targetType = targetMeta.type;
			found = true;
		}

		if (found) return this._pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType});

		return {};
	}

	static _pGetItemActorPassive_getTargetMetricAdjusted ({targetValue, targetUnits, targetType}) {
		targetValue = Config.getMetricNumberDistance({configGroup: this._configGroup, originalValue: targetValue, originalUnit: "feet"});
		if (targetUnits) targetUnits = Config.getMetricUnitDistance({configGroup: this._configGroup, originalUnit: targetUnits});

		return {targetValue, targetUnits, targetType};
	}

	static _pGetItemActorPassive_mutDamageAndFormula ({entry, opts, strEntries, state}) {
		this._pGetItemActorPassive_mutDamageAndFormula_playerOrVehicle({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutDamageAndFormula_creature({entry, opts, strEntries, state});
	}

	static _pGetItemActorPassive_mutDamageAndFormula_playerOrVehicle ({entry, opts, state, strEntries}) {
		if (opts.mode !== "player" && opts.mode !== "vehicle") return;
		if (!entry.entries) return;

				let strEntriesNoDamageDice = strEntries;
		if (!state.damageParts?.length) {
			const {str, damageTupleMetas} = this._getDamageTupleMetas(strEntries, {summonSpellLevel: opts.summonSpellLevel});
			strEntriesNoDamageDice = str;

			const {damageParts: damageParts_, formula: formula_} = this._getDamagePartsAndOtherFormula(damageTupleMetas);

			state.damageParts = damageParts_;
			state.formula = state.formula ?? formula_;
		}
		
				if (state.formula == null) {
						strEntriesNoDamageDice.replace(/{(?:@dice|@scaledice) ([^|}]+)(?:\|[^}]+)?}/i, (...m) => {
				const [dice] = m[1].split("|");
				state.formula = dice;
			});
		}
			}

	static _pGetItemActorPassive_mutDamageAndFormula_creature ({entry, opts, strEntries, state}) {
		if (opts.mode !== "creature") return;
		if (!entry.entries?.length) return;

		if (!state.damageParts?.length && state.formula == null) {
			const str = entry.entries[0];
			if (typeof str !== "string") return;

			const {damageTupleMetas} = this._getDamageTupleMetas(str);
			const {damageParts, formula} = this._getDamagePartsAndOtherFormula(damageTupleMetas);

			state.damageParts = damageParts;
			state.formula = formula;
		}
	}

	static _pGetItemActorPassive_mutTarget ({entry, opts, strEntries, state}) {
		this._pGetItemActorPassive_mutTarget_player({entry, opts, strEntries, state});
		this._pGetItemActorPassive_mutTarget_creature({entry, opts, strEntries, state});
	}

	static _pGetItemActorPassive_mutTarget_player ({entry, opts, strEntries, state}) {
		if (opts.mode !== "player") return;

		if (state.targetPrompt === undefined) state.targetPrompt = Config.getSafe(this._configGroup, "isTargetTemplatePrompt");
	}

	static _pGetItemActorPassive_mutTarget_creature ({entry, opts, strEntries, state}) {
		if (opts.mode !== "creature") return;
		if (!strEntries) return;

		if (!state.targetValue && !state.targetUnits && !state.targetType) {
			const targetMeta = this._pGetItemActorPassive_getTargetMeta({opts, strEntries});
			state.targetValue = targetMeta.targetValue || state.targetValue;
			state.targetUnits = targetMeta.targetUnits || state.targetUnits;
			state.targetType = targetMeta.targetType || state.targetType;
		}

		if (state.targetPrompt === undefined) state.targetPrompt = Config.getSafe(this._configGroup, "isTargetTemplatePrompt");
	}

	static _pGetItemActorPassive_mutActionType ({entry, opts, state}) {
		this._pGetItemActorPassive_mutActionType_player({entry, opts, state});
		this._pGetItemActorPassive_mutActionType_creature({entry, opts, state});
	}

	static _pGetItemActorPassive_mutActionType_player ({entry, opts, state}) {
		if (state.actionType || opts.mode !== "player" || !entry.entries?.length) return;

		const walker = MiscUtil.getWalker({keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST, isNoModification: true, isBreakOnReturn: true});
		walker.walk(
			entry.entries,
			{
				string: str => {
					const mMeleeRangedWeaponAttack = /you\b[^.!?]*\bmake a (?<type>melee|ranged) weapon attack/i.exec(str);
					if (mMeleeRangedWeaponAttack) {
						state.actionType = mMeleeRangedWeaponAttack.groups.type.toLowerCase() === "melee" ? "mwak" : "rwak";
						return true;
					}

					const mMeleeRangedSpellAttack = /you\b[^.!?]*\bmake a (?<type>melee|ranged) spell attack/i.exec(str);
					if (mMeleeRangedSpellAttack) {
						state.actionType = mMeleeRangedSpellAttack.groups.type.toLowerCase() === "melee" ? "msak" : "rsak";
						return true;
					}

					const mHeal = /creature\b[^.!?]*\bregains\b[^.!?]*\bhit points?/i.exec(str);
					if (mHeal) {
						state.actionType = "heal";
						return true;
					}
				},
			},
		);

		state.actionType = state.actionType || "other";
	}

	static _pGetItemActorPassive_mutActionType_creature ({entry, opts, state}) {
		if (state.actionType || opts.mode !== "creature" || !entry.entries?.length) return;

		state.actionType = "other";
	}

	static _pGetItemActorPassive_mutProperties ({entry, opts, state}) {
		this._pGetItemActorPassive_mutProperties_player({entry, opts, state});
		this._pGetItemActorPassive_mutProperties_creature({entry, opts, state});
	}

	static _pGetItemActorPassive_mutProperties_player ({entry, opts, state}) {
		if (state.properties !== undefined || opts.mode !== "player" || !entry.entries?.length) return;

		state.properties = [];

		UtilDataConverter.WALKER_READONLY_GENERIC.walk(
			entry.entries,
			{
				string: [
					this._pGetItemActorPassive_mutProperties_doSharedWalk.bind(this, {state}),
				],
			},
		);
	}

	static _pGetItemActorPassive_mutProperties_creature ({entry, opts, state}) {
		if (state.properties !== undefined || opts.mode !== "creature" || !entry.entries?.length) return;

		state.properties = [];

		UtilDataConverter.WALKER_READONLY_GENERIC.walk(
			entry.entries,
			{
				string: [
					this._pGetItemActorPassive_mutProperties_doSharedWalk.bind(this, {state}),
				],
			},
		);
	}

	static _pGetItemActorPassive_mutProperties_doSharedWalk ({state}, str) {
		const strStripped = Renderer.stripTags(str);
		if (UtilDataConverter.isConcentrationString(strStripped)) state.properties.push("concentration");
	}

	static _pGetItemActorPassive_mutEffects ({entry, opts, state}) {
		this._pGetItemActorPassive_mutEffects_player({entry, opts, state});
		this._pGetItemActorPassive_mutEffects_creature({entry, opts, state});
	}

	static _pGetItemActorPassive_mutEffects_player ({entry, opts, state}) {
		if (opts.mode !== "player" || !entry.entries?.length) return;

				void 0;
	}

	static _pGetItemActorPassive_mutEffects_creature ({entry, opts, state}) {
		if (opts.mode !== "creature" || !entry.entries?.length) return;

				if (!UtilCompat.isPlutoniumAddonAutomationActive()) return;

		const effects = UtilAutomation.getCreatureFeatureEffects({entry, img: state.img});
		if (effects.length) state.effectsParsed.push(...effects);
	}

	static _pGetItemActorPassive_mutFlags ({entry, opts, state}) {
		this._pGetItemActorPassive_mutFlags_player({entry, opts, state});
		this._pGetItemActorPassive_mutFlags_creature({entry, opts, state});
	}

	static _pGetItemActorPassive_mutFlags_player ({entry, opts, state}) {
		if (opts.mode !== "player" || !entry.entries?.length) return;

				void 0;
	}

	static _pGetItemActorPassive_mutFlags_creature ({entry, opts, state}) {
		if (opts.mode !== "creature" || !entry.entries?.length) return;

		if (!UtilCompat.isPlutoniumAddonAutomationActive()) return;

		const flags = UtilAutomation.getCreatureFeatureFlags({
			entry,
			hasDamageParts: !!state.damageParts?.length,
			hasSavingThrow: !!state.saveDc,
		});

		foundry.utils.mergeObject(state.flagsParsed, flags);
	}

	
	static _DEFAULT_SAVING_THROW_DATA = {
		saveAbility: undefined,
		saveScaling: undefined,
		saveDc: undefined,
	};

	static getSavingThrowData (entries) {
		if (!entries?.length) return MiscUtil.copyFast(this._DEFAULT_SAVING_THROW_DATA);

		let isFoundParse = false;
		let {
			saveAbility,
			saveScaling,
			saveDc,
		} = MiscUtil.copyFast(this._DEFAULT_SAVING_THROW_DATA);

		const walker = MiscUtil.getWalker({keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST, isNoModification: true, isBreakOnReturn: true});
		const reDc = /(?:{@dc (?<dc>\d+)}|DC\s*(?<dcAlt>\d+))\s*(?<ability>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i;

		walker.walk(
			entries,
			{
				string: (str) => {
					const mDc = reDc.exec(str);
					if (!mDc) return;

					saveDc = Number(mDc.groups.dc || mDc.groups.dcAlt);
					saveAbility = mDc.groups.ability.toLowerCase().substring(0, 3);
					saveScaling = "flat";
					isFoundParse = true;

					return true;
				},
			},
		);

		return {saveAbility, saveScaling, saveDc, isFoundParse};
	}

	
	static getMaxCasterProgression (...casterProgressions) {
		casterProgressions = casterProgressions.filter(Boolean);
		const ixs = casterProgressions.map(it => this._CASTER_PROGRESSIONS.indexOf(it)).filter(ix => ~ix);
		if (!ixs.length) return null;
		return this._CASTER_PROGRESSIONS[Math.min(...ixs)];
	}

	static getMaxCantripProgression (...casterProgressions) {
		const out = [];
		casterProgressions
			.filter(Boolean)
			.forEach(progression => {
				progression.forEach((cnt, i) => {
					if (out[i] == null) return out[i] = cnt;
					out[i] = Math.max(out[i], cnt);
				});
			});
		return out;
	}

		static async pFillActorSkillToolLanguageData (
		{
			existingProficienciesSkills,
			existingProficienciesTools,
			existingProficienciesLanguages,
			skillProficiencies,
			languageProficiencies,
			toolProficiencies,
			skillToolLanguageProficiencies,
			actorData,
			importOpts,
						titlePrefix,
		},
	) {
		skillToolLanguageProficiencies = this._pFillActorSkillToolLanguageData_getMergedProfs({
			skillProficiencies,
			languageProficiencies,
			toolProficiencies,
			skillToolLanguageProficiencies,
		});

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			titlePrefix,
			existingFvtt: {
				skillProficiencies: existingProficienciesSkills,
				toolProficiencies: existingProficienciesTools,
				languageProficiencies: existingProficienciesLanguages,
			},
			available: skillToolLanguageProficiencies,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplySkillFormDataToActorUpdate({
			existingProfsActor: existingProficienciesSkills,
			formData,
			actorData,
		});

		this.doApplyOtherProficienciesFormData({
			existingProfsActor: existingProficienciesLanguages,
			formData,
			formDataProp: "languageProficiencies",
			actorData,
			opts: {
				fnGetMappedItem: it => UtilActors.getMappedLanguage(it),
				fnGetMappedCustomItem: it => Renderer.splitTagByPipe(it)[0].toTitleCase(),
				actorTraitProp: "languages",
			},
		});

		this.doApplyToolFormDataToActorUpdate({
			existingProfsActor: existingProficienciesTools,
			formData,
			actorData,
		});
			}

		static _pFillActorSkillToolLanguageData_getMergedProfs (
		{
			skillProficiencies,
			languageProficiencies,
			toolProficiencies,
			skillToolLanguageProficiencies,
		},
	) {
		const hasAnySingles = skillProficiencies?.length || languageProficiencies?.length || toolProficiencies?.length;
		if (!hasAnySingles) return skillToolLanguageProficiencies;

		if (!skillToolLanguageProficiencies?.length) {
			const out = [];
			this._pFillActorSkillToolLanguageData_doMergeToSingleArray({
				targetArray: out,
				skillProficiencies,
				languageProficiencies,
				toolProficiencies,
			});
			return out;
		}

		if (skillToolLanguageProficiencies?.length && hasAnySingles) console.warn(...LGT, `Founds individual skill/language/tool proficiencies alongside combined skill/language/tool; these will be merged together.`);

		const out = MiscUtil.copyFast(skillToolLanguageProficiencies || []);
		this._pFillActorSkillToolLanguageData_doMergeToSingleArray({
			targetArray: out,
			skillProficiencies,
			languageProficiencies,
			toolProficiencies,
		});
		return out;
	}

	static _pFillActorSkillToolLanguageData_doMergeToSingleArray (
		{
			targetArray,
			skillProficiencies,
			languageProficiencies,
			toolProficiencies,
		},
	) {
		const maxLen = Math.max(
			targetArray?.length || 0,
			skillProficiencies?.length || 0,
			languageProficiencies?.length || 0,
			toolProficiencies?.length || 0,
		);
		for (let i = 0; i < maxLen; ++i) {
			const tgt = (targetArray[i] = {});

			const skillProfSet = skillProficiencies?.[i];
			const langProfSet = languageProficiencies?.[i];
			const toolProfSet = toolProficiencies?.[i];

						if (skillProfSet) {
				this._pFillActorSkillToolLanguageData_doAddProfType({
					targetObject: tgt,
					profSet: skillProfSet,
					validKeySet: new Set(Object.keys(Parser.SKILL_TO_ATB_ABV)),
					anyKeySet: new Set(["any"]),
					anyKeySuffix: "Skill",
				});
			}
			
						if (langProfSet) {
				this._pFillActorSkillToolLanguageData_doAddProfType({
					targetObject: tgt,
					profSet: langProfSet,
					anyKeySet: new Set(["any", "anyStandard", "anyExotic"]),
					anyKeySuffix: "Language",
				});
			}
			
						if (toolProfSet) {
				this._pFillActorSkillToolLanguageData_doAddProfType({
					targetObject: tgt,
					profSet: toolProfSet,
					anyKeySet: new Set(["any"]),
					anyKeySuffix: "Tool",
				});
			}
					}
	}

	static _pFillActorSkillToolLanguageData_doAddProfType (
		{
			targetObject,
			profSet,
			validKeySet,
			anyKeySet,
			anyKeySuffix,
		},
	) {
		Object.entries(profSet)
			.forEach(([k, v]) => {
				switch (k) {
					case "choose": {
						if (v?.from?.length) {
							const choose = MiscUtil.copyFast(v);
							choose.from = choose.from.filter(kFrom => !validKeySet || validKeySet.has(kFrom));
							if (choose.from.length) {
								const tgtChoose = (targetObject.choose = targetObject.choose || []);
								tgtChoose.push(choose);
							}
						}
						break;
					}

					default: {
						if (anyKeySet && anyKeySet.has(k)) {
							targetObject[`${k}${anyKeySuffix}`] = MiscUtil.copyFast(v);
							break;
						}

						if (!validKeySet || validKeySet.has(k)) targetObject[k] = MiscUtil.copyFast(v);
					}
				}
			});
	}

		static async pFillActorSkillData (existingProfsActor, skillProficiencies, actorData, dataBuilderOpts, opts) {
		return this._pFillActorSkillToolData({
			existingProfsActor,
			proficiencies: skillProficiencies,
			actorData,
			dataBuilderOpts,
			opts,
			fnGetMapped: Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect),
			propProficiencies: "skillProficiencies",
			pFnApplyToActorUpdate: this.doApplySkillFormDataToActorUpdate.bind(this),
		});
	}

		static async pFillActorToolData (existingProfsActor, toolProficiencies, actorData, dataBuilderOpts, opts) {
		return this._pFillActorSkillToolData({
			existingProfsActor,
			proficiencies: toolProficiencies,
			actorData,
			dataBuilderOpts,
			opts,
			fnGetMapped: Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect),
			propProficiencies: "toolProficiencies",
			pFnApplyToActorUpdate: this.doApplyToolFormDataToActorUpdate.bind(this),
		});
	}

	static async _pFillActorSkillToolData (
		{
			existingProfsActor,
			proficiencies,
			actorData,
			dataBuilderOpts,
			opts,
			fnGetMapped,
			propProficiencies,
			pFnApplyToActorUpdate,
		},
	) {
		opts = opts || {};

		if (!proficiencies) return {};
		proficiencies = fnGetMapped(proficiencies);

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				[propProficiencies]: existingProfsActor,
			},
			available: proficiencies,
		});
		if (!formData) return dataBuilderOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		return pFnApplyToActorUpdate({existingProfsActor, formData, actorData});
	}

	static doApplySkillFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		return this._doApplySkillToolFormDataToActorUpdate(
			{
				existingProfsActor,
				formData,
				actorData,
				mapAbvToFull: UtilActors.SKILL_ABV_TO_FULL,
				propFormData: "skillProficiencies",
				propActorData: "skills",
			},
		);
	}

	static doApplyToolFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		return this._doApplySkillToolFormDataToActorUpdate(
			{
				existingProfsActor,
				formData,
				actorData,
				mapAbvToFull: UtilActors.TOOL_ABV_TO_FULL,
				propFormData: "toolProficiencies",
				propActorData: "tools",
			},
		);
	}

		static _doApplySkillToolFormDataToActorUpdate ({existingProfsActor, formData, actorData, mapAbvToFull, propFormData, propActorData}) {
		if (!formData?.data?.[propFormData]) return;

		const out = {};

				actorData[propActorData] = actorData[propActorData] || {};
		Object.entries(mapAbvToFull)
			.filter(([_, name]) => formData.data[propFormData][name])
			.forEach(([abv, name]) => {
				out[abv] = formData.data[propFormData][name];

				const maxValue = Math.max(
					(existingProfsActor[abv] || {}).value || 0,
					formData.data[propFormData][name] != null ? Number(formData.data[propFormData][name]) : 0,
					(actorData[propActorData][abv] || {}).value || 0,
				);

				const isUpdate = maxValue > (MiscUtil.get(actorData[propActorData], abv, "value") || 0);
				if (isUpdate) (actorData[propActorData][abv] = actorData[propActorData][abv] || {}).value = maxValue;
			});

		return out;
	}

		static async pFillActorLanguageData (existingProfsActor, importingProfs, data, importOpts, opts) {
		opts = opts || {};

		if (!importingProfs) return;
		importingProfs = Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies(importingProfs);

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				languageProficiencies: existingProfsActor,
			},
			available: importingProfs,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		return this.doApplyLanguageProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

	static doApplyLanguageProficienciesFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		return this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "languageProficiencies",
			actorData,
			opts: {
				fnGetMappedItem: it => UtilActors.getMappedLanguage(it),
				fnGetMappedCustomItem: it => Renderer.splitTagByPipe(it)[0].toTitleCase(),
				actorTraitProp: "languages",
			},
		});
	}

		static async pFillActorToolProfData (existingProfsActor, importingProfs, data, dataBuilderOpts, opts) {
		opts = opts || {};

		if (!importingProfs) return;
		importingProfs = Charactermancer_OtherProficiencySelect.getMappedToolProficiencies(importingProfs);

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				toolProficiencies: existingProfsActor,
			},
			available: importingProfs,
		});
		if (!formData) return dataBuilderOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyToolProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

	static doApplyToolProficienciesFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyToolFormDataToActorUpdate({
			existingProfsActor: existingProfsActor,
			formData,
			actorData,
		});
	}

		static async pFillActorLanguageOrToolData (existingProfsLanguages, existingProfsTools, importingProfs, actorData, importOpts, opts) {
		opts = opts || {};

		if (!importingProfs) return;
		importingProfs = Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies(importingProfs);
		importingProfs = Charactermancer_OtherProficiencySelect.getMappedToolProficiencies(importingProfs);

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				languageProficiencies: existingProfsLanguages,
				toolProficiencies: existingProfsTools,
			},
			available: importingProfs,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyOtherProficienciesFormData({
			existingProfsActor: existingProfsLanguages,
			formData,
			formDataProp: "languageProficiencies",
			actorData,
			opts: {
				fnGetMappedItem: it => UtilActors.getMappedLanguage(it),
				fnGetMappedCustomItem: it => Renderer.splitTagByPipe(it)[0].toTitleCase(),
				actorTraitProp: "languages",
			},
		});

		this.doApplyToolFormDataToActorUpdate({
			existingProfsActor: existingProfsTools,
			formData,
			actorData,
		});
	}

		static async pFillActorArmorProfData (existingProfsActor, importingProfs, data, importOpts, opts) {
		opts = opts || {};

		if (!importingProfs) return;
		importingProfs = Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies(importingProfs);

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				armorProficiencies: existingProfsActor,
			},
			available: importingProfs,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyArmorProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

	static doApplyArmorProficienciesFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "armorProficiencies",
			actorData,
			opts: {
				fnGetMappedItem: it => UtilActors.getMappedArmorProficiency(it),
				fnGetMappedCustomItem: it => Renderer.splitTagByPipe(it)[0].toTitleCase(),
				actorTraitProp: "armorProf",
			},
		});
	}

		static async pFillActorWeaponProfData (existingProfsActor, importingProfs, data, importOpts, opts) {
		opts = opts || {};

		if (!importingProfs) return;
		importingProfs = Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies(importingProfs);

		const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				weaponProficiencies: existingProfsActor,
			},
			available: importingProfs,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyWeaponProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

	static doApplyWeaponProficienciesFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "weaponProficiencies",
			actorData,
			opts: {
				fnGetMappedItem: it => UtilActors.getMappedWeaponProficiency(it),
				fnGetMappedCustomItem: it => Renderer.splitTagByPipe(it)[0].toTitleCase(),
				actorTraitProp: "weaponProf",
			},
		});
	}

		static doApplyOtherProficienciesFormData ({existingProfsActor, formData, formDataProp, actorData, opts}) {
		if (!formData?.data?.[formDataProp]) return;

		existingProfsActor = existingProfsActor || {};

		const formDataSet = formData.data[formDataProp];

		if (!Object.keys(formDataSet).length) return;
		const cpyFormDataSet = MiscUtil.copyFast(formDataSet);

		const profSet = new Set();
		Object.keys(cpyFormDataSet).filter(k => cpyFormDataSet[k]).forEach(k => profSet.add(k));

		const out = [];

				const mappedValidItems = new Set();
		const customItems = [];

				(existingProfsActor.value || []).forEach(it => mappedValidItems.add(it));
		(existingProfsActor.custom || "").split(";").map(it => it.trim()).filter(Boolean).forEach(it => this._doApplyFormData_doCheckAddCustomItem(customItems, it));

				const existingProfsActorData = MiscUtil.get(actorData, "traits", opts.actorTraitProp);
		(existingProfsActorData?.value || []).forEach(it => mappedValidItems.add(it));
		(existingProfsActorData?.custom || "").split(";").map(it => it.trim()).filter(Boolean).forEach(it => this._doApplyFormData_doCheckAddCustomItem(customItems, it));

				profSet.forEach(profRaw => {
			const mapped = opts.fnGetMappedItem ? opts.fnGetMappedItem(profRaw) : profRaw;

			if (mapped) {
				if (!mappedValidItems.has(mapped)) out.push(mapped);
				return mappedValidItems.add(mapped);
			}

			const toAdd = opts.fnGetMappedCustomItem ? opts.fnGetMappedCustomItem(profRaw) : profRaw.toTitleCase();
			this._doApplyFormData_doCheckAddCustomItem(customItems, toAdd);
		});

				const dataTarget = MiscUtil.set(actorData, "traits", opts.actorTraitProp, {});
		dataTarget.value = [...mappedValidItems].map(it => it.toLowerCase()).sort(SortUtil.ascSortLower);
		dataTarget.custom = customItems.join(";");

		return out;
	}

	static _doApplyFormData_doCheckAddCustomItem (customItems, item) {
		const cleanItem = item.trim().toLowerCase();
		if (!customItems.some(it => it.trim().toLowerCase() === cleanItem)) customItems.push(item);
	}

	static doApplySavingThrowProficienciesFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		if (!formData?.data?.savingThrowProficiencies) return;

		actorData.abilities = actorData.abilities || {};
		Parser.ABIL_ABVS
			.filter(ab => formData.data.savingThrowProficiencies[ab])
			.forEach(ab => {
				const maxValue = Math.max(
					existingProfsActor[ab]?.proficient || 0,
					formData.data.savingThrowProficiencies[ab] ? 1 : 0,
					actorData.abilities[ab]?.proficient || 0,
				);
				const isUpdate = maxValue > (MiscUtil.get(actorData.abilities, ab, "proficient") || 0);
				if (isUpdate) MiscUtil.set(actorData.abilities, ab, "proficient", maxValue);
			});
	}

		static async pFillActorImmunityData (existingProfsActor, importing, data, importOpts, opts) {
		opts = opts || {};

		const formData = await Charactermancer_DamageImmunitySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				immune: existingProfsActor,
			},
			available: importing,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyDamageImmunityFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

		static async pFillActorResistanceData (existingProfsActor, importing, data, importOpts, opts) {
		opts = opts || {};

		const formData = await Charactermancer_DamageResistanceSelect.pGetUserInput({
			...opts,
			existingFvtt: {
				resist: existingProfsActor,
			},
			available: importing,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyDamageResistanceFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

		static async pFillActorVulnerabilityData (existingProfsActor, importing, data, importOpts, opts) {
		opts = opts || {};

		const formData = await Charactermancer_DamageVulnerabilitySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				vulnerable: existingProfsActor,
			},
			available: importing,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyDamageVulnerabilityFormDataToActorUpdate({existingProfsActor, formData, actorData: data});
	}

		static async pFillActorConditionImmunityData (existing, importing, data, importOpts, opts) {
		opts = opts || {};

		const formData = await Charactermancer_ConditionImmunitySelect.pGetUserInput({
			...opts,
			existingFvtt: {
				conditionImmune: existing,
			},
			available: importing,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyConditionImmunityFormDataToActorUpdate({existingProfsActor: existing, formData, actorData: data});
	}

	static doApplyDamageImmunityFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "immune",
			actorData,
			opts: {
				actorTraitProp: "di",
			},
		});
	}

	static doApplyDamageResistanceFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "resist",
			actorData,
			opts: {
				actorTraitProp: "dr",
			},
		});
	}

	static doApplyDamageVulnerabilityFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "vulnerable",
			actorData,
			opts: {
				actorTraitProp: "dv",
			},
		});
	}

	static doApplyConditionImmunityFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplyOtherProficienciesFormData({
			existingProfsActor,
			formData,
			formDataProp: "conditionImmune",
			actorData,
			opts: {
				fnGetMappedItem: it => it === "disease" ? "diseased" : it,
				actorTraitProp: "ci",
			},
		});
	}

		static async pFillActorExpertiseData (
		{
			existingProficienciesSkills,
			existingProficienciesTools,
			expertise,
			actorData,
			importOpts,
						titlePrefix,
		},
	) {
				const mergedExistingProficienciesSkills = existingProficienciesSkills ? MiscUtil.copyFast(existingProficienciesSkills) : existingProficienciesSkills;
		const mergedExistingProficienciesTools = existingProficienciesTools ? MiscUtil.copyFast(existingProficienciesTools) : existingProficienciesTools;

		if (mergedExistingProficienciesSkills && actorData.skills) {
			Object.entries(actorData.skills)
				.forEach(([key, meta]) => {
					if (!meta) return;

					mergedExistingProficienciesSkills[key] = mergedExistingProficienciesSkills[key] || MiscUtil.copyFast(meta);
					mergedExistingProficienciesSkills[key].value = Math.max(mergedExistingProficienciesSkills[key].value, meta.value);
				});
		}

		if (mergedExistingProficienciesSkills && actorData.tools) {
			Object.entries(actorData.tools)
				.forEach(([key, meta]) => {
					if (!meta) return;

					mergedExistingProficienciesTools[key] = mergedExistingProficienciesTools[key] || MiscUtil.copyFast(meta);
					mergedExistingProficienciesTools[key].value = Math.max(mergedExistingProficienciesTools[key].value, meta.value);
				});
		}
		
		const formData = await Charactermancer_ExpertiseSelect.pGetUserInput({
			titlePrefix,
			existingFvtt: {
				skillProficiencies: mergedExistingProficienciesSkills,
				toolProficiencies: mergedExistingProficienciesTools,
			},
			available: expertise,
		});
		if (!formData) return importOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		this.doApplyExpertiseFormDataToActorUpdate({
			existingProfsActor: {
				skillProficiencies: existingProficienciesSkills,
				toolProficiencies: existingProficienciesTools,
			},
			formData,
			actorData: actorData,
		});
	}

	static doApplyExpertiseFormDataToActorUpdate ({existingProfsActor, formData, actorData}) {
		this.doApplySkillFormDataToActorUpdate({
			existingProfsActor: existingProfsActor.skillProficiencies,
			formData,
			actorData,
		});

		this.doApplyToolFormDataToActorUpdate({
			existingProfsActor: existingProfsActor.toolProficiencies,
			formData,
			actorData,
		});
	}

	
	static doApplySensesFormDataToActorUpdate ({existingSensesActor, existingTokenActor, formData, actorData, actorToken, configGroup}) {
		if (!Object.keys(formData?.data).length) return;

		const dataTarget = MiscUtil.getOrSet(actorData, "attributes", "senses", {});
		Object.assign(dataTarget, MiscUtil.copyFast(existingSensesActor));

		const foundrySenseData = this._getFoundrySenseData({configGroup, formData});

				this._getSensesNumericalKeys(foundrySenseData)
			.forEach(kSense => {
				const range = foundrySenseData[kSense];
				delete foundrySenseData[kSense];

				if (range == null) return;
				dataTarget[kSense] = Math.max(dataTarget[kSense], range);
			});

				Object.assign(dataTarget, foundrySenseData);
		
				let {sight: {range: curSightRange}} = existingTokenActor || {sight: {}};
		if (curSightRange == null || isNaN(curSightRange) || Number(curSightRange) !== curSightRange) {
						const cleanedSightRange = curSightRange == null || isNaN(curSightRange) ? 0 : Number(curSightRange);
			if (curSightRange === 0) MiscUtil.set(actorToken, "sight", "range", cleanedSightRange);
		}

		MiscUtil.set(actorToken, "sight", "enabled", true);

		this.mutTokenSight({
			dataAttributesSenses: dataTarget,
			dataToken: actorToken,
			configGroup,
		});
	}

	static _getFoundrySenseData ({configGroup, formData}) {
		const out = {};

		Object.entries(formData.data)
			.forEach(([sense, range]) => {
				if (!range) return out[sense] = null;

				range = Config.getMetricNumberDistance({configGroup, originalValue: range, originalUnit: "feet"});
								range = Number(range.toFixed(2));

				out[sense] = range;
			});

		const units = Config.getMetricUnitDistance({configGroup, originalUnit: "ft"});
		if (!out.units || units !== "ft") out.units = units;

		return out;
	}

	static _getSensesNumericalKeys () {
				const sensesModel = CONFIG.Item.dataModels.race.defineSchema().senses;
		return Object.entries(sensesModel.fields)
			.filter(([, v]) => v instanceof foundry.data.fields.NumberField).map(([k]) => k);
	}

	
	static mutTokenSight ({dataAttributesSenses, dataToken, configGroup}) {
		if (!dataAttributesSenses) return {dataAttributesSenses, dataToken};

		if (dataAttributesSenses.darkvision) {
			MiscUtil.set(dataToken, "sight", "range", Math.max(dataToken.sight?.dim ?? 0, dataAttributesSenses.darkvision));
			if (dataToken.sight?.visionMode == null || dataToken.sight?.visionMode === "basic") MiscUtil.set(dataToken, "sight", "visionMode", "darkvision");
		}

		let hasNonDarkvisionSense = false;
		for (const prop of ["blindsight", "tremorsense", "truesight"]) {
			if (!dataAttributesSenses[prop]) continue;

			hasNonDarkvisionSense = true;

			const isUse = dataAttributesSenses[prop] > (dataToken.sight?.range ?? 0);
			if (!isUse) continue;

			MiscUtil.set(dataToken, "sight", "range", dataAttributesSenses[prop]);

			if (dataToken.sight?.visionMode === "basic") {
				MiscUtil.set(dataToken, "sight", "visionMode", prop === "tremorsense" ? "tremorsense" : "darkvision");
			}
		}

		if (dataAttributesSenses.truesight) this._mutTokenSight_addUpdateDetectionMode({dataToken, id: "seeAll", range: dataAttributesSenses.truesight});
		if (dataAttributesSenses.tremorsense) this._mutTokenSight_addUpdateDetectionMode({dataToken, id: "feelTremor", range: dataAttributesSenses.tremorsense});
		if (dataAttributesSenses.blindsight) this._mutTokenSight_addUpdateDetectionMode({dataToken, id: "blindsight", range: dataAttributesSenses.blindsight});

						if (
			dataAttributesSenses.darkvision
			&& !hasNonDarkvisionSense
						&& Config.getSafe(configGroup, "tokenVisionSaturation") !== ConfigConsts.C_USE_GAME_DEFAULT
		) {
			MiscUtil.set(dataToken, "sight", "saturation", -1);
		}

		return {dataAttributesSenses, dataToken};
	}

	static _mutTokenSight_addUpdateDetectionMode ({dataToken, id, range}) {
		const detectionModeArr = MiscUtil.getOrSet(dataToken, "detectionModes", []);
		const existing = detectionModeArr.find(mode => mode?.id === id);
		if (existing) return existing.range = Math.max(existing.range, range);
		detectionModeArr.push({id, range, enabled: true});
	}

	
	static _RE_IS_VERSATILE = / (?:two|both) hands/i;
	static _getDamageTupleMetas (str, {summonSpellLevel = 0} = {}) {
		const damageTupleMetas = [];

		const ixFirstDc = str.indexOf(`{@dc `);

		let ixLastMatch = null;
		let lenLastMatch = null;

								const strOut = str
			.replace(/(?:(?<dmgFlat>\d+)|\(?{@(?:dice|damage) (?<dmgDice1>[^|}]+)(?:\|[^}]+)?}(?:\s+[-+]\s+the spell's level)?(?: plus {@(?:dice|damage) (?<dmgDice2>[^|}]+)(?:\|[^}]+)?})?\)?)(?:\s+[-+]\s+[-+a-zA-Z0-9 ]*?)?(?: (?<dmgType>[^ ]+))? damage/gi, (...mDamage) => {
				const [fullMatch] = mDamage;
				const [ixMatch, , {dmgFlat, dmgDice1, dmgDice2, dmgType}] = mDamage.slice(-3);

				const dmgDice1Clean = dmgDice1 ? dmgDice1.split("|")[0] : null;
				const dmgDice2Clean = dmgDice2 ? dmgDice2.split("|")[0] : null;
				const dmgTypeClean = dmgType || "";

				const isFlatDamage = dmgFlat != null;
				let dmg = isFlatDamage
					? dmgFlat
					: dmgDice2Clean
						? `${dmgDice1Clean} + ${dmgDice2Clean}` : dmgDice1Clean;

								if (isFlatDamage) {
					const tokens = str.split(/( )/g);
					let lenTokenStack = 0;
					const tokenStack = [];
					for (let i = 0; i < tokens.length; ++i) {
						tokenStack.push(tokens[i]);
						lenTokenStack += tokens[i].length;

						if (lenTokenStack === ixMatch) {
							const lastFourTokens = tokenStack.slice(-4);
							if (/^by dealing$/i.test(lastFourTokens.join("").trim())) {
								return "";
							}
						}
					}
				}

								dmg = dmg.replace(/\bPB\b/gi, `@${SharedConsts.MODULE_ID_FAKE}.userchar.pb`);

								dmg = dmg.replace(/\bsummonSpellLevel\b/gi, `${summonSpellLevel ?? 0}`);

				const tupleMeta = {
					tuple: [dmg, dmgTypeClean],
					isOnFailSavingThrow: false,
					isAlternateRoll: false,
				};

								if (~ixFirstDc && ixMatch >= ixFirstDc) {
					tupleMeta.isOnFailSavingThrow = true;
				}

												if (
					damageTupleMetas.last()?.isAlternateRoll
					|| (
						damageTupleMetas.length
						&& /\bor\b/.test(str.slice(ixLastMatch + lenLastMatch, ixMatch))
						&& !this._RE_IS_VERSATILE.test(str.slice(ixMatch + fullMatch.length))
					)
				) {
					tupleMeta.isAlternateRoll = true;
				}

				damageTupleMetas.push(tupleMeta);

				ixLastMatch = ixMatch;
				lenLastMatch = fullMatch.length;

				return "";
			})
			.replace(/ +/g, " ");

		return {
			str: strOut, 			damageTupleMetas: damageTupleMetas.filter(it => it.tuple.length),
		};
	}

	static _getDamagePartsAndOtherFormula (damageTupleMetas) {
		damageTupleMetas = damageTupleMetas || [];

		const damageTuples = [];
		const otherFormulaParts = [];

		damageTupleMetas.forEach(meta => {
			if (
				(!Config.get("import", "isUseOtherFormulaFieldForSaveHalvesDamage") || !meta.isOnFailSavingThrow)
				&& (!Config.get("import", "isUseOtherFormulaFieldForSaveHalvesDamage") || !meta.isAlternateRoll)
			) return damageTuples.push(meta.tuple);

			otherFormulaParts.push(`${meta.tuple[1] ? "(" : ""}${meta.tuple[0]}${meta.tuple[1] ? `)[${meta.tuple[1]}]` : ""}`);
		});

				if (!damageTuples.length) return {damageParts: damageTupleMetas.map(it => it.tuple), formula: ""};

		return {damageParts: damageTuples, formula: otherFormulaParts.join(" + ")};
	}

	
	static _getSpeedValue (speeds, prop, configGroup) {
		if (speeds == null) return null;

		if (typeof speeds === "number") {
			return prop === "walk"
				? Config.getMetricNumberDistance({configGroup, originalValue: speeds, originalUnit: "feet"})
				: null;
		}

		const speed = speeds[prop];

		if (speed == null) return null;
				if (typeof speed === "boolean") return null;
		if (speed.number != null) return Config.getMetricNumberDistance({configGroup, originalValue: speed.number, originalUnit: "feet"});
		if (isNaN(speed)) return null;
		return Config.getMetricNumberDistance({configGroup, originalValue: Number(speed), originalUnit: "feet"});
	}

		static _SPEED_PROPS_IS_EQUAL_MAP = {
		burrow: "burrow",
		climb: "climb",
		fly: "fly",
		swim: "swim",
	};

		static async _pGetSpeedEffects (speeds, {actor, actorItem, iconEntity, iconPropCompendium, taskRunner = null} = {}) {
		if (speeds == null) return [];

		const icon = null;/* iconEntity && iconPropCompendium
			? await this._ImageFetcher.pGetSaveImagePath(iconEntity, {propCompendium: iconPropCompendium, taskRunner})
			: undefined; */

				
		if (typeof speeds === "number") return [];

		const toMap = Object.entries(speeds)
			.filter(([k, v]) => this._SPEED_PROPS_IS_EQUAL_MAP[k] && v === true);

		if (!toMap.length) return [];

		return [
			...toMap.map(([k]) => {
				return UtilActiveEffects.getGenericEffect({
					key: `system.attributes.movement.${this._SPEED_PROPS_IS_EQUAL_MAP[k]}`,
					value: `@attributes.movement.walk`,
					mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
					name: `${k.toTitleCase()} Speed`,
					icon,
					disabled: false,
					priority: UtilActiveEffects.PRIORITY_BASE,
					originActor: actor,
					originActorItem: actorItem,
				});
			}),
		];
	}

	static _isSpeedHover (speed) {
		if (speed == null) return false;
		if (typeof speed === "number") return false;
		return !!speed.canHover;
	}

		static getMovement (speed, {configGroup = null, propAllowlist = null} = {}) {
		return {
			burrow: (!propAllowlist || propAllowlist.has("burrow")) ? this._getSpeedValue(speed, "burrow", configGroup) : null,
			climb: (!propAllowlist || propAllowlist.has("climb")) ? this._getSpeedValue(speed, "climb", configGroup) : null,
			fly: (!propAllowlist || propAllowlist.has("fly")) ? this._getSpeedValue(speed, "fly", configGroup) : null,
			swim: (!propAllowlist || propAllowlist.has("swim")) ? this._getSpeedValue(speed, "swim", configGroup) : null,
			walk: (!propAllowlist || propAllowlist.has("walk")) ? this._getSpeedValue(speed, "walk", configGroup) : null,
			units: Config.getMetricUnitDistance({configGroup, originalUnit: "ft"}),
			hover: this._isSpeedHover(speed),
		};
	}

	
	static _getParsedWeaponEntryData (ent) {
		if (!(ent.entries && ent.entries[0] && typeof ent.entries[0] === "string")) return;

		const damageTupleMetas = [];
		let attackBonus = 0;
		let isAttackFlat = false;

		const str = ent.entries[0];

		damageTupleMetas.push(...this._getDamageTupleMetas(str).damageTupleMetas);

		const {rangeShort, rangeLong, rangeUnits} = this._getAttackRange(str);

		const mHit = /{@hit ([^|}]+)(?:\|[^}]+)?}/gi.exec(str);
		if (mHit) {
			const hitBonus = Number(mHit[1]);
			if (!isNaN(hitBonus)) {
				attackBonus = hitBonus;
			}
		}

		return {
			damageTupleMetas,
			rangeShort,
			rangeLong,
			rangeUnits,
			attackBonus,
			isAttackFlat,
		};
	}

	static _getAttackRange (str) {
		let rangeShort = null;
		let rangeLong = null;

				const mRange = /range (\d+)(?:\/(\d+))? ft/gi.exec(str);
		if (mRange) {
			rangeShort = Number(mRange[1]);
			if (mRange[2]) rangeLong = Number(mRange[2]);
		} else {
			const mReach = /reach (\d+) ft/gi.exec(str);
			if (mReach) {
				rangeShort = Number(mReach[1]);
			}
		}

		rangeShort = Config.getMetricNumberDistance({configGroup: this._configGroup, originalValue: rangeShort, originalUnit: "feet"});
		rangeLong = Config.getMetricNumberDistance({configGroup: this._configGroup, originalValue: rangeLong, originalUnit: "feet"});

		return {
			rangeShort,
			rangeLong,
			rangeUnits: rangeShort || rangeLong
				? Config.getMetricUnitDistance({configGroup: this._configGroup, originalUnit: "feet"})
				: null,
		};
	}

	static getImportedEmbed (importedEmbeds, itemData) {
		const importedEmbed = importedEmbeds.find(it => it.raw === itemData);

		if (!importedEmbed) {
			ui.notifications.warn(`Failed to link embedded entity for active effects! ${VeCt.STR_SEE_CONSOLE}`);
			console.warn(...LGT, `Could not find loaded item data`, itemData, `in imported embedded entities`, importedEmbeds);
			return null;
		}

		return importedEmbed;
	}

	
	static _mutApplyDocOwnership (
		docData,
		{
			defaultOwnership,
			isAddDefaultOwnershipFromConfig,
			userOwnership,
		},
	) {
		if (defaultOwnership != null) docData.ownership = {default: defaultOwnership};
		else if (isAddDefaultOwnershipFromConfig) docData.ownership = {default: Config.get(this._configGroup, "ownership")};

		if (userOwnership) Object.assign(docData.ownership ||= {}, userOwnership);
	}

	
	static _getTranslationData (
		{
			srdData,
		},
	) {
		if (
			!srdData
			|| !Config.get("integrationBabele", "isEnabled")
			|| !UtilCompat.isBabeleActive()
			|| !srdData.flags?.[UtilCompat.MODULE_BABELE]
		) return null;

		return {
			name: srdData.name,
			description: srdData.system?.description?.value,
			flags: {
				[UtilCompat.MODULE_BABELE]: {
					translated: !!srdData.flags[UtilCompat.MODULE_BABELE].translated,
					hasTranslation: !!srdData.flags[UtilCompat.MODULE_BABELE].hasTranslation,
				},
			},
		};
	}

	static _getTranslationMeta (
		{
			name,
			translationData,
			description,
		},
	) {
		if (translationData == null) return {name, description, flags: {}};

		const flags = {
			[UtilCompat.MODULE_BABELE]: {
				...(translationData.flags?.[UtilCompat.MODULE_BABELE] || {}),
				originalName: name,
			},
		};

		name = translationData.name;

		if (description && Config.get("integrationBabele", "isUseTranslatedDescriptions")) description = translationData.description || description;

		return {name, description, flags};
	}

	
	static _getWeaponTargetDataDefault ({srdData = null} = {}) {
		const fromSrd = MiscUtil.get(srdData, "system", "target");

		if (fromSrd?.value || fromSrd?.type) return fromSrd;

		switch (Config.get("import", "weaponTargetDefault")) {
			case ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__CREATURE_OR_OBJECT: return {value: 1, units: "", type: "creatureOrObject"};
			case ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__CREATURE: return {value: 1, units: "", type: "creature"};
			default: return {value: 0, units: "", type: ""};
		}
	}

	
	static async pGetSubEntityMetas ({ent}) {
		if (!this._SideDataInterface) return [];

		const sideData = await this._SideDataInterface.pGetSideLoaded(ent);
		if (!sideData) return [];
		if (!sideData.subEntities) return [];

		return Object.entries(sideData.subEntities)
			.flatMap(([prop, ents]) => {
				if (!(ents instanceof Array)) return [];

				return ents
					.map(entSub => ({
						prop,
						entSub,
					}));
			});
	}

	
	static getReplacedPlutSymbols (str) {
		return str
			.replace(new RegExp(DataConverter.SYM_AT, "g"), "@")
			.replace(new RegExp(DataConverter.SYM_CURLY_OPEN, "g"), "{")
			.replace(new RegExp(DataConverter.SYM_CURLY_CLOSE, "g"), "}");
	}
}

DataConverter.SYM_AT = "<PLUT_SYM__AT>";
DataConverter.SYM_CURLY_OPEN = "<PLUT_SYM__CURLY_OPEN>";
DataConverter.SYM_CURLY_CLOSE = "<PLUT_SYM__CURLY_CLOSE>";

DataConverter._CASTER_PROGRESSIONS = [ 	"full",
	"artificer",
	"1/2",
	"1/3",
	"pact",
];

var DataConverter$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    DataConverter: DataConverter
});

class DataConverterJournal extends DataConverter {
    static _mutPageDataOwnershipFlags({pageData, flags}) {
        pageData.ownership = {
            default: CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT
        };
        pageData.flags = flags ? MiscUtil.copy(flags) : {};
    }

    static _getContentPage({name, content, flags}) {
        if (!content)
            return null;

        const pageData = {
            name,
            type: "text",
            text: {
                format: 1,
                content,
            },
        };
        this._mutPageDataOwnershipFlags({
            pageData,
            flags
        });
        return pageData;
    }

    static _getImgPage({name, img, flags}) {
        if (!img)
            return null;

        const pageData = {
            name: `${name} (Image)`,
            type: "image",
            src: img,
        };
        this._mutPageDataOwnershipFlags({
            pageData,
            flags
        });
        return pageData;
    }

    static _getPages({name, content, img, flags}) {
        return [this._getContentPage({
            name,
            content,
            flags
        }), this._getImgPage({
            name,
            img,
            flags
        }), ].filter(Boolean);
    }

    static async _pGetWithJournalDescriptionPlugins(pFn) {
        return UtilDataConverter.pGetWithDescriptionPlugins(async()=>{
            const renderer = Renderer.get().setPartPageExpandCollapseDisabled(true);
            const out = await pFn();
            renderer.setPartPageExpandCollapseDisabled(false);
            return out;
        }
        );
    }
}

class DataConverterClass extends DataConverter {
	static _configGroup = "importClass";

	static _SideDataInterface = SideDataInterfaceClass;
	//static _ImageFetcher = ImageFetcherClass;

	static _getDoNotUseNote () {
		return DescriptionRenderer.pGetWithDescriptionPlugins(() => `<p>${Renderer.get().render(`{@note Note: importing a class as an item is provided for display purposes only. If you wish to import a class to a character sheet, please use the importer on the sheet instead.}`)}</p>`);
	}

		static _getDataHitDice (cls) {
		if (cls.hd?.number !== 1) return null;
		if (!cls.hd?.faces) return null;

		const asString = `d${cls.hd.faces}`;
		if (!CONFIG.DND5E.hitDieTypes.includes(asString)) return null;
		return asString;
	}

    static async pGetDocumentJsonClass (cls, opts) {
		opts = opts || {};
		if (opts.actor) opts.isActorItem = true;

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const itemId = foundry.utils.randomID();

		if (!opts.isClsDereferenced) {
            cls = await DataLoader.pCacheAndGet("class", cls.source, UrlUtil.URL_TO_HASH_BUILDER["class"](cls), {isRequired: true});
		}

		if (opts.pageFilter?.filterBox && opts.filterValues) {
			cls = MiscUtil.copy(cls); 
			Renderer.class.mutFilterDereferencedClassFeatures({
				cpyCls: cls,
				pageFilter: opts.pageFilter,
				filterValues: opts.filterValues,
			});
		}

		const srdData = await CompendiumCache.pGetAdditionalDataDoc("class", cls, {isSrdOnly: true, taskRunner: opts.taskRunner});

		const fluff = opts.fluff || await Renderer.class.pGetFluff(cls);

		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(cls, {isActorItem: opts.isActorItem})),
			description: await this._pGetClassDescription({cls, fluff, opts}),
		});

		const identifierCls = UtilDocumentItem.getNameAsIdentifier(cls.name);

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(cls, {propCompendium: "class", fluff, taskRunner: opts.taskRunner});

		const hitDice = this._getDataHitDice(cls);

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(cls);
		const additionalAdvancement = await this._SideDataInterface._pGetAdvancementSideLoaded(cls);



		const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({ent: cls, img, actor: opts.actor});
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importClass", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		const systemBase = {
			identifier: identifierCls,
			description: {value: translatedDescription, chat: ""},
			source: UtilDocumentSource.getSourceObjectFromEntity(cls),
			levels: opts.level ??
								1,
			hitDice,
			hitDiceUsed: 0,
			spellcasting: {
				progression: UtilActors.getMappedCasterType(cls.casterProgression) || cls.casterProgression,
				ability: cls.spellcastingAbility,
			},
			advancement: [
				...this._getClassAdvancementFromSrd(cls, srdData, opts),
				...this._getClassAdvancement(cls, opts),
				...(additionalAdvancement || []),
			],
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(cls, {systemBase});

		console.log("additionalAdvancement", additionalAdvancement, additionalFlags);

		const out = {
			id: itemId,
			_id: itemId,
			name: translatedName,
			type: "class",
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			ownership: {default: 0},
			flags: {
				...translatedFlags,
				...this._getClassSubclassFlags({
					cls,
															filterValues: opts.filterValues,
					proficiencyImportMode: opts.proficiencyImportMode,
					isActorItem: opts.isActorItem,
					spellSlotLevelSelection: opts.spellSlotLevelSelection,
				}),
				...additionalFlags,
			},
			effects: UtilActiveEffects.getEffectsMutDedupeId(
				[
					await this._pGetPreparedSpellsEffect({
						cls,
						actorId: opts.actor?.id,
						itemId,
						existing: this._getExistingPreparedSpellsEffect({actor: opts.actor}),
						taskRunner: opts.taskRunner,
					}),
					...effectsSideTuples.map(it => it.effect),
				]
					.filter(Boolean),
			),
			img,
		};

		//this._mutApplyDocOwnership(out, opts);

		return out;
	}

	static async _pGetDescriptionRenderedFluff ({entity, fluff}) {
		return DescriptionRenderer.pGetWithDescriptionPlugins(() => {
			const renderer = Renderer.get().resetHeaderIndex();

			const isImportText = Config.get("importClass", "isImportDescriptionFluffText");
			const isRenderImages = Config.get("importClass", "isImportDescriptionFluffImages");

			const rendered = [
				isRenderImages && fluff?.images?.length
					? renderer.setFirstSection(true).render({type: "entries", entries: [fluff.images[0]]})
					: null,
				isImportText && fluff?.entries?.length
					? Renderer.utils.getFluffTabContent({entity, fluff, isImageTab: false})
					: null,
				isRenderImages && fluff?.images && fluff?.images.length > 1
					? renderer.setFirstSection(true).render({type: "entries", entries: [...fluff.images.slice(1)]})
					: null,
			]
				.filter(Boolean)
				.join("");

			if (!rendered) return "";
			return `<div>${rendered}</div>`;
		});
	}

	static async _pGetClassDescription ({cls, fluff, opts}) {
		const ptDoNotUse = !opts.isActorItem ? await this._getDoNotUseNote() : "";

		const ptTable = await DescriptionRenderer.pGetWithDescriptionPlugins(() => this.pGetRenderedClassTable(cls));

		const ptFluff = await this._pGetDescriptionRenderedFluff({entity: cls, fluff});

		const ptFeatures = !opts.isActorItem
			? await DescriptionRenderer.pGetWithDescriptionPlugins(() => Renderer.get().setFirstSection(true).render({type: "section", entries: cls.classFeatures.flat()}))
			: "";

				if (!Config.get("importClass", "isImportDescription")) return `<div class="mb-2 ve-flex-col">${ptDoNotUse}${ptTable}</div>`;

		return `<div class="mb-2 ve-flex-col">${ptDoNotUse}${ptFluff}${ptTable}${ptFeatures}</div>`;
	}

	static _SRD_ADVANCEMENT_SCALE_VALUE_AUTOMATION_MAPPINGS = {
		[Parser.SRC_PHB]: {
			"Monk": {
				"die": "martial-arts",
			},
			"Bard": {
				"inspiration": "bardic-inspiration",
			},
		},
	};

	static _getClassAdvancementFromSrd (cls, srdData, opts) {
		if (!srdData?.system?.advancement?.length) return [];

		const out = (srdData?.system?.advancement || []).filter(it => it.type === "ScaleValue");

		if (!out.length) return out;

		if (!UtilCompat.isPlutoniumAddonAutomationActive()) return out;

																		
		const copies = out
			.map((adv) => {
				const identifierAlt = this._SRD_ADVANCEMENT_SCALE_VALUE_AUTOMATION_MAPPINGS[cls.source]?.[cls.name]?.[adv.configuration.identifier];
				if (!identifierAlt) return null;

				const cpy = MiscUtil.copyFast(adv);
				cpy._id = foundry.utils.randomID();
				cpy.configuration.identifier = identifierAlt;
				cpy.title = `${cpy.title} (Automation Addon)`;
				return cpy;
			})
			.filter(Boolean);

		return [
			...out,
			...copies,
		];
	}

	static _getClassAdvancement (cls, opts) {
		return [
			...(opts.actor?.type === "npc" && !cls.isSidekick ? [] : this._getClassAdvancement_hitPoints(cls, opts)),
			...this._getClassAdvancement_saves(cls, opts),
			...this._getClassAdvancement_skills(cls, opts),
		];
	}

	static _getClassAdvancement_hitPoints (cls, opts) {
		const hitDice = this._getDataHitDice(cls);
		if (hitDice == null) return [];

		const advancement = UtilAdvancements.getAdvancementHitPoints({
			hpAdvancementValue: opts.hpAdvancementValue,
			isActorItem: opts.isActorItem,
		});
		if (advancement == null) return [];

		return [advancement];
	}

	static _getClassAdvancement_saves (cls, opts) {
		const saves = (cls.proficiency || [])
			.filter(it => Parser.ATB_ABV_TO_FULL[it]);
		if (!saves.length) return [];

		const advancement = UtilAdvancements.getAdvancementSaves({
			savingThrowProficiencies: [saves.mergeMap(abv => ({[abv]: true}))], 			classRestriction: "primary",
			level: 1,
		});
		if (advancement == null) return [];

		return [advancement];
	}

	static _getClassAdvancement_skills (cls, opts) {
		return [
			UtilAdvancements.getAdvancementSkills({
				skillProficiencies: cls.startingProficiencies?.skills,
				classRestriction: "primary",
				skillsChosenFvtt: opts.proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY
					? opts.startingSkills
					: null,
				level: 1,
			}),
			UtilAdvancements.getAdvancementSkills({
				skillProficiencies: cls.multiclassing?.proficienciesGained?.skills,
				classRestriction: "secondary",
				skillsChosenFvtt: opts.proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS
					? opts.startingSkills
					: null,
				level: 1,
			}),
		]
			.filter(Boolean);
	}

	static _getClassSubclassFlags ({cls, sc, filterValues, proficiencyImportMode, isActorItem, spellSlotLevelSelection}) {
		const out = {
			[SharedConsts.MODULE_ID]: {
				page: UrlUtil.PG_CLASSES,
				source: sc ? sc.source : cls.source,
				hash: sc ? UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc) : UrlUtil.URL_TO_HASH_BUILDER["class"](cls),

				propDroppable: sc ? "subclass" : "class",
				filterValues,

				isPrimaryClass: proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY,

				spellSlotLevelSelection,
			},
		};

		if (isActorItem) out[SharedConsts.MODULE_ID].isDirectImport = true;

		return out;
	}

	static _getAllSkillChoices (skillProfs) {
		const allSkills = new Set();

		skillProfs.forEach(skillProfGroup => {
			Object.keys(Parser.SKILL_TO_ATB_ABV)
				.filter(skill => skillProfGroup[skill])
				.forEach(skill => allSkills.add(skill));

			if (skillProfGroup.choose?.from?.length) {
				skillProfGroup.choose.from
					.filter(skill => Parser.SKILL_TO_ATB_ABV[skill])
					.forEach(skill => allSkills.add(skill));
			}
		});

		return Object.entries(UtilActors.SKILL_ABV_TO_FULL)
			.filter(([, vetKey]) => allSkills.has(vetKey))
			.map(([fvttKey]) => fvttKey);
	}

	/**
	 * @param {any} cls a class in 5eTools schema
	 * @param {any} sc a subclass in 5eTools schema
	 * @param {any} opts
	 */
	static async pGetDocumentJsonSubclass (cls, sc, opts) {
		opts = opts || {};
		if (opts.actor) opts.isActorItem = true;

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const itemId = foundry.utils.randomID();

		if (!opts.isScDereferenced) {
						sc = await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc));
		}

		if (opts.pageFilter?.filterBox && opts.filterValues) {
			sc = MiscUtil.copyFast(sc);

			Renderer.class.mutFilterDereferencedSubclassFeatures({
				cpySc: sc,
				pageFilter: opts.pageFilter,
				filterValues: opts.filterValues,
			});
		}

		const srdData = await CompendiumCache.pGetAdditionalDataDoc("subclass", sc, {isSrdOnly: true, taskRunner: opts.taskRunner});

		const fluff = opts.fluff || await Renderer.subclass.pGetFluff(sc);

		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(sc, {isActorItem: opts.isActorItem})),
			description: await this._pGetSubclassDescription({cls, sc, fluff, opts}),
		});

		const identifierCls = UtilDocumentItem.getNameAsIdentifier(cls.name);
		const identifierSc = UtilDocumentItem.getNameAsIdentifier(sc.name);

		const imgMetaSc = null; //await this._ImageFetcher.pGetSaveImagePathMeta(sc, {propCompendium: "subclass", fluff, taskRunner: opts.taskRunner});
		const imgMetaCls = (Config.get("importClass", "isUseDefaultSubclassImage") || (imgMetaSc && !imgMetaSc.isFallback))
			? null
			: await this._ImageFetcher.pGetSaveImagePathMeta(cls, {propCompendium: "class", fluff: await Renderer.class.pGetFluff(cls), taskRunner: opts.taskRunner});

		const img = null;//(imgMetaSc && !imgMetaSc.isFallback) ? imgMetaSc.img : imgMetaCls && !imgMetaCls.isFallback ? imgMetaCls.img : (imgMetaSc?.img || imgMetaCls.img);
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(sc, {propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"});
		const additionalAdvancement = await this._SideDataInterface._pGetAdvancementSideLoaded(sc, {propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"});

		const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({ent: sc, img, actor: opts.actor}, {propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"});
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importClass", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		const systemBase = {
			identifier: identifierSc,
			classIdentifier: identifierCls,
			description: {value: translatedDescription, chat: ""},
			source: UtilDocumentSource.getSourceObjectFromEntity(sc),
			spellcasting: {
				progression: UtilActors.getMappedCasterType(sc.casterProgression) || sc.casterProgression,
				ability: sc.spellcastingAbility,
			},
			advancement: [
				...(srdData?.system?.advancement || [])
					.filter(it => it.type === "ScaleValue"),
				...(additionalAdvancement || []),
			],
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(sc, {propOpts: "_SIDE_LOAD_OPTS_SUBCLASS", systemBase});

		const out = {
			id: itemId,
			_id: itemId,
			name: translatedName,
			type: "subclass",
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			ownership: {default: 0},
			flags: {
				...translatedFlags,
				...this._getClassSubclassFlags({
					cls,
					sc,
					filterValues: opts.filterValues,
					proficiencyImportMode: opts.proficiencyImportMode,
					isActorItem: opts.isActorItem,
				}),
				...additionalFlags,
			},
			effects: UtilActiveEffects.getEffectsMutDedupeId(
				[
					await this._pGetPreparedSpellsEffect({
						cls,
						sc,
						actorId: opts.actor?.id,
						itemId,
						existing: this._getExistingPreparedSpellsEffect({actor: opts.actor}),
						taskRunner: opts.taskRunner,
					}),
					...effectsSideTuples.map(it => it.effect),
				]
					.filter(Boolean),
			),
			img,
		};

		this._mutApplyDocOwnership(out, opts);

		console.log("CHECK FLAGS", out);
		return out;
	}

	static async _pGetSubclassDescription ({cls, sc, fluff, opts}) {
		const ptDoNotUse = !opts.isActorItem ? await this._getDoNotUseNote() : "";

		const ptFluff = await this._pGetDescriptionRenderedFluff({entity: sc, fluff});

				const fauxFluff = MiscUtil.copyFast(Renderer.findEntry(sc.subclassFeatures || {}));

		const cleanEntries = MiscUtil.getWalker({keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST})
			.walk(
				MiscUtil.copyFast(fauxFluff.entries),
				{
					array: (arr) => {
						return arr.filter(it => !it?.data?.isFvttSyntheticFeatureLink);
					},
				},
			);

				const ptFauxFluff = opts.isActorItem
			? Renderer.get().setFirstSection(true).render({type: "entries", entries: cleanEntries})
			: "";
		
		const ptFeatures = !opts.isActorItem
			? await DescriptionRenderer.pGetWithDescriptionPlugins(() => Renderer.get().setFirstSection(true).render({type: "section", entries: sc.subclassFeatures.flat()}))
			: "";

				if (!Config.get("importClass", "isImportDescription")) return `<div class="mb-2 ve-flex-col">${ptDoNotUse}</div>`;

		return `<div class="mb-2 ve-flex-col">${ptDoNotUse}${ptFluff || ptFauxFluff}${ptFeatures}</div>`;
	}

	static async pGetRenderedClassTable (cls, sc = null, opts = {}) {
		if (!Config.get("importClass", "isImportClassTable")) return "";

		return DescriptionRenderer.pGetWithDescriptionPlugins(async () => {
						cls = await DataLoader.pCacheAndGet("class", cls.source, UrlUtil.URL_TO_HASH_BUILDER["class"](cls));

			if (sc) {
				sc = await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc));
			}
			
			return this.getRenderedClassTableFromDereferenced(cls, sc, opts);
		});
	}

	static getRenderedClassTableFromDereferenced (cls, sc, {isAddHeader = false, isSpellsOnly = false} = {}) {
		if (!cls) return "";

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const tblGroupHeaders = [];
		const tblHeaders = [];

		const renderTableGroupHeader = (tableGroup) => {
						let thGroupHeader;
			if (tableGroup.title) {
				thGroupHeader = `<th class="cls-tbl__col-group" colspan="${tableGroup.colLabels.length}">${tableGroup.title}</th>`;
			} else {
								thGroupHeader = `<th colspan="${tableGroup.colLabels.length}"></th>`;
			}
			tblGroupHeaders.push(thGroupHeader);

						tableGroup.colLabels.forEach(lbl => {
				tblHeaders.push(`<th class="cls-tbl__col-generic-center"><div class="cls__squash_header">${Renderer.get().render(lbl)}</div></th>`);
			});
		};

		if (cls.classTableGroups) {
			cls.classTableGroups.forEach(tableGroup => {
				if (isSpellsOnly) tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
				if (!tableGroup) return;
				renderTableGroupHeader(tableGroup);
			});
		}

		if (sc?.subclassTableGroups) {
			sc.subclassTableGroups.forEach(tableGroup => {
				if (isSpellsOnly) tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
				if (!tableGroup) return;
				renderTableGroupHeader(tableGroup);
			});
		}

		const tblRows = cls.classFeatures.map((lvlFeatures, ixLvl) => {
			const pb = Math.ceil((ixLvl + 1) / 4) + 1;

			const lvlFeaturesFilt = lvlFeatures
				.filter(it => it.name && it.type !== "inset"); 
			const dispsFeatures = lvlFeaturesFilt
				.map((it, ixFeature) => `<div class="inline-block">${it.name}${ixFeature === lvlFeaturesFilt.length - 1 ? "" : `<span class="mr-1">,</span>`}</div>`);

			const ptTableGroups = [];

			const renderTableGroupRow = (tableGroup) => {
				const row = (tableGroup.rowsSpellProgression || tableGroup.rows)[ixLvl] || [];
				const cells = row.map(cell => `<td class="cls-tbl__col-generic-center">${cell === 0 ? "\u2014" : Renderer.get().render(cell)}</td>`);
				ptTableGroups.push(...cells);
			};

			if (cls.classTableGroups) {
				cls.classTableGroups.forEach(tableGroup => {
					if (isSpellsOnly) tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
					if (!tableGroup) return;
					renderTableGroupRow(tableGroup);
				});
			}

			if (sc?.subclassTableGroups) {
				sc.subclassTableGroups.forEach(tableGroup => {
					if (isSpellsOnly) tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
					if (!tableGroup) return;
					renderTableGroupRow(tableGroup);
				});
			}

			return `<tr class="cls-tbl__stripe-odd">
				<td class="cls-tbl__col-level">${Parser.getOrdinalForm(ixLvl + 1)}</td>
				${isSpellsOnly ? "" : `<td class="cls-tbl__col-prof-bonus">+${pb}</td>`}
				${isSpellsOnly ? "" : `<td>${dispsFeatures.join("") || `\u2014`}</td>`}
				${ptTableGroups.join("")}
			</tr>`;
		});

				return `<table class="cls-tbl shadow-big w-100 mb-3">
			<tbody>
			<tr><th class="ve-tbl-border" colspan="15"></th></tr>
			${isAddHeader ? `<tr><th class="cls-tbl__disp-name" colspan="15">${cls.name}</th></tr>` : ""}
			<tr>
				<th colspan="${isSpellsOnly ? "1" : "3"}"></th>
				${tblGroupHeaders.join("")}
			</tr>
			<tr>
				<th class="cls-tbl__col-level">Level</th>
				${isSpellsOnly ? "" : `<th class="cls-tbl__col-prof-bonus">Proficiency Bonus</th>`}
				${isSpellsOnly ? "" : `<th>Features</th>`}
				${tblHeaders.join("")}
			</tr>
			${tblRows.join("")}
			<tr><th class="ve-tbl-border" colspan="15"></th></tr>
			</tbody>
		</table>`;
	}

	static _getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup (tableGroup) {
		tableGroup = MiscUtil.copyFast(tableGroup);

		if (/spell/i.test(`${tableGroup.title || ""}`)) return tableGroup;

		if (!tableGroup.colLabels) return null;

		const ixsSpellLabels = new Set(tableGroup.colLabels
			.map((it, ix) => {
				const stripped = Renderer.stripTags(`${it || ""}`);
				return /cantrip|spell|slot level/i.test(stripped) ? ix : null;
			})
			.filter(ix => ix != null));

		if (!ixsSpellLabels.size) return null;

		tableGroup.colLabels = tableGroup.colLabels.filter((_, ix) => ixsSpellLabels.has(ix));
		if (tableGroup.rowsSpellProgression) tableGroup.rowsSpellProgression = tableGroup.rowsSpellProgression.map(row => row.filter((_, ix) => ixsSpellLabels.has(ix)));
		if (tableGroup.rows) tableGroup.rows = tableGroup.rows.map(row => row.filter((_, ix) => ixsSpellLabels.has(ix)));

		return tableGroup;
	}

	static _getExistingPreparedSpellsEffect ({actor}) {
		if (!actor) return null;
		return actor.effects.contents.find(it => (it.name || "").toLowerCase().trim() === "prepared spells");
	}

	static async _pGetPreparedSpellsEffect ({cls, sc, actorId, itemId, existing, taskRunner}) {
		if (existing) return null;
		if (sc && !sc.preparedSpells) return null;
		if (!sc && !cls.preparedSpells) return null;

        const spellsPreparedFormula = Charactermancer_Spell_Util.getMaxPreparedSpellsFormula({cls, sc});
		if (!spellsPreparedFormula) return null;

        //if (game) return null;

		return UtilActiveEffects.getGenericEffect({
			key: `flags.${UtilCompat.MODULE_TIDY5E_SHEET}.maxPreparedSpells`,
			value: spellsPreparedFormula,
            mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
			name: `Prepared Spells`,
			icon: null,//await this._ImageFetcher.pGetSaveImagePath(cls, {propCompendium: "class", taskRunner}),
			disabled: false,
			priority: UtilActiveEffects.PRIORITY_BASE,
			originActorId: actorId,
			originActorItemId: itemId,
		});
	}

	static isStubClass (cls) {
		if (!cls) return false;
		return cls.name === DataConverterClass.STUB_CLASS.name && cls.source === DataConverterClass.STUB_CLASS.source;
	}

	static isStubSubclass (sc) {
		if (!sc) return false;
		return sc.name === DataConverterClass.STUB_SUBCLASS.name && sc.source === DataConverterClass.STUB_SUBCLASS.source;
	}

	static getClassStub () {
		const out = MiscUtil.copyFast(DataConverterClass.STUB_CLASS);
		out.subclasses = [
			{
				...MiscUtil.copyFast(DataConverterClass.STUB_SUBCLASS),
				className: out.name,
				classSource: out.source,
			},
		];
		return out;
	}

	static getSubclassStub ({cls}) {
		const out = MiscUtil.copyFast(DataConverterClass.STUB_SUBCLASS);
		out.className = cls.name;
		out.classSource = cls.source;
		return out;
	}
}

DataConverterClass.STUB_CLASS = {
	name: "Unknown Class",
	source: Parser.SRC_PHB,
	classFeatures: [],
	_isStub: true,
};
DataConverterClass.STUB_SUBCLASS = {
	name: "Unknown Subclass",
	source: Parser.SRC_PHB,
	subclassFeatures: [],
	_isStub: true,
};

class DataConverterFeature extends DataConverter {
    static async _pGetGenericDescription (ent, configGroup, {fluff = null} = {}) {
		if (!Config.get(configGroup, "isImportDescription") && !fluff?.entries?.length) return "";

		const pts = [
			Config.get(configGroup, "isImportDescription")
				? await DescriptionRenderer.pGetWithDescriptionPlugins(() => {
					const prerequisite = Renderer.utils.prerequisite.getHtml(ent.prerequisite);

					return `<div>
						${prerequisite ? `<p>${prerequisite}</p>` : ""}
						${Renderer.get().setFirstSection(true).render({entries: ent.entries}, 2)}
					</div>`;
				})
				: null,
			fluff?.entries?.length
				? Renderer.get().setFirstSection(true).render({type: "entries", entries: fluff?.entries})
				: "",
		]
			.filter(Boolean)
			.join(`<hr class="hr-1">`);

		return pts.length
			? `<div>${pts}</div>`
			: "";
	}

    static _getData_getConsume({ent, actor}) {
        if (!ent?.consumes)
            return {};

        const sheetItem = DataConverter.getConsumedSheetItem({
            consumes: ent.consumes,
            actor
        });
        if (!sheetItem)
            return {};

        return {
            type: "charges",
            amount: ent.consumes.amount ?? 1,
            target: sheetItem.id,
        };
    }

    /**
	 * Load SideData and update the actor
     * @param {any} actor
     * @param {{system:any}} actorUpdate
     * @param {any} ent an entity in 5eTools schema
     * @param {any} dataBuilderOpts
     * @returns {any}
     */
    static async pMutActorUpdateFeature(actor, actorUpdate, ent, dataBuilderOpts) {
		//Relies on our parent class to specify what _SideDataInterface is
        const sideData = await this._SideDataInterface.pGetSideLoaded(ent);
        this.mutActorUpdate(actor, actorUpdate, ent, { sideData });
    }

    static async pGetDereferencedFeatureItem(feature) {
        return MiscUtil.copy(feature);
    }

    static async pGetClassSubclassFeatureAdditionalEntities(actor, entity, {taskRunner=null}={}) {
        const sideData = await this._SideDataInterface.pGetSideLoaded(entity);
        if (!sideData)
            return [];
        if (!sideData.subEntities)
            return [];

        const {ChooseImporter} = await Promise.resolve().then(function() {
            return ChooseImporter$1;
        });

        for (const prop in sideData.subEntities) {
            if (!sideData.subEntities.hasOwnProperty(prop))
                continue;

            const arr = sideData.subEntities[prop];
            if (!(arr instanceof Array))
                continue;

            const importer = ChooseImporter.getImporter(prop, {
                actor
            });
            await importer.pInit();
            for (const ent of arr) {
                await importer.pImportEntry(ent, {
                    taskRunner,
                }, );
            }
        }
    }
}
class DataConverterClassSubclassFeature extends DataConverterFeature {
	static _configGroup = "importClassSubclassFeature";

	static _SideDataInterface = SideDataInterfaceClassSubclassFeature;
	//static _ImageFetcher = ImageFetcherClassSubclassFeature;

	static async pGetDereferencedFeatureItem (feature) {
		const type = UtilEntityClassSubclassFeature.getEntityType(feature);
		const hash = UrlUtil.URL_TO_HASH_BUILDER[type](feature);
						return DataLoader.pCacheAndGet(type, feature.source, hash, {isCopy: true});
	}

	static async pGetInitFeatureLoadeds (feature, {actor = null} = {}) {
		const isIgnoredLookup = await this._pGetInitFeatureLoadeds_getIsIgnoredLookup(feature);

		const type = UtilEntityClassSubclassFeature.getEntityType(feature);
		switch (type) {
			case "classFeature": {
				const uid = DataUtil.class.packUidClassFeature(feature);
				const asClassFeatureRef = {classFeature: uid};
				await PageFilterClassesFoundry.pInitClassFeatureLoadeds({classFeature: asClassFeatureRef, className: feature.className, actor, isIgnoredLookup});
				return asClassFeatureRef;
			}
			case "subclassFeature": {
				const uid = DataUtil.class.packUidSubclassFeature(feature);
				const asSubclassFeatureRef = {subclassFeature: uid};
				const subclassNameLookup = await DataUtil.class.pGetSubclassLookup();
				const subclassName = MiscUtil.get(subclassNameLookup, feature.classSource, feature.className, feature.subclassSource, feature.subclassShortName, "name");
				await PageFilterClassesFoundry.pInitSubclassFeatureLoadeds({subclassFeature: asSubclassFeatureRef, className: feature.className, subclassName: subclassName, actor, isIgnoredLookup});
				return asSubclassFeatureRef;
			}
			default: throw new Error(`Unhandled feature type "${type}"`);
		}
	}

	static async _pGetInitFeatureLoadeds_getIsIgnoredLookup (feature) {
		if (!feature.entries) return {};

		const type = UtilEntityClassSubclassFeature.getEntityType(feature);
		switch (type) {
			case "classFeature": {
				return this.pGetClassSubclassFeatureIgnoredLookup({data: {classFeature: [feature]}});
			}
			case "subclassFeature": {
				return this.pGetClassSubclassFeatureIgnoredLookup({data: {subclassFeature: [feature]}});
			}
			default: throw new Error(`Unhandled feature type "${type}"`);
		}
	}

	static async pGetClassSubclassFeatureIgnoredLookup ({data}) {
		if (!data.classFeature?.length && !data.subclassFeature?.length) return {};

		const isIgnoredLookup = {};

		const allRefsClassFeature = new Set();
		const allRefsSubclassFeature = new Set();

		(data.classFeature || []).forEach(cf => {
			const {refsClassFeature, refsSubclassFeature} = Charactermancer_Class_Util.getClassSubclassFeatureReferences(cf.entries);

			refsClassFeature.forEach(ref => allRefsClassFeature.add((ref.classFeature || "").toLowerCase()));
			refsSubclassFeature.forEach(ref => allRefsSubclassFeature.add((ref.subclassFeature || "").toLowerCase()));
		});

		(data.subclassFeature || []).forEach(scf => {
			const {refsClassFeature, refsSubclassFeature} = Charactermancer_Class_Util.getClassSubclassFeatureReferences(scf.entries);

			refsClassFeature.forEach(ref => allRefsClassFeature.add((ref.classFeature || "").toLowerCase()));
			refsSubclassFeature.forEach(ref => allRefsSubclassFeature.add((ref.subclassFeature || "").toLowerCase()));
		});

		for (const uid of allRefsClassFeature) {
			if (await this._SideDataInterface.pGetIsIgnoredSideLoaded(DataUtil.class.unpackUidClassFeature(uid))) {
				isIgnoredLookup[uid] = true;
			}
		}

		for (const uid of allRefsSubclassFeature) {
			if (await this._SideDataInterface.pGetIsIgnoredSideLoaded(DataUtil.class.unpackUidSubclassFeature(uid))) {
				isIgnoredLookup[uid] = true;
			}
		}

		return isIgnoredLookup;
	}

	static async pGetDocumentJson (feature, opts) {
		opts = opts || {};
		if (opts.actor) opts.isActorItem = true;

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const out = await this._pGetClassSubclassFeatureItem(feature, opts);

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(feature, {systemBase: out.system});
		out.system = foundry.utils.mergeObject(
			out.system,
			(additionalSystem || {}),
		);

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(feature);
		out.flags = foundry.utils.mergeObject(
			out.flags,
			(additionalFlags || {}),
		);

		this._mutApplyDocOwnership(out, opts);

		return out;
	}

	static _isUnarmoredDefense (feature) {
		const cleanLowerName = (feature.name || "").toLowerCase().trim();
		return /^unarmored defen[sc]e/.test(cleanLowerName);
	}

	static _getUnarmoredDefenseMeta (entity) {
		if (!entity.entries) return null;

		const attribs = new Set();

		JSON.stringify(entity.entries).replace(/(strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha) modifier/gi, (fullMatch, ability) => {
			ability = ability.slice(0, 3).toLowerCase();
			attribs.add(ability);
		});

		const predefinedKey = CollectionUtil.setEq(DataConverterClassSubclassFeature._UNARMORED_DEFENSE_BARBARIAN, attribs) ? "unarmoredBarb" : CollectionUtil.setEq(DataConverterClassSubclassFeature._UNARMORED_DEFENSE_MONK, attribs) ? "unarmoredMonk" : null;

		return {
			formula: ["10", ...[...attribs].map(ab => `@abilities.${ab}.mod`)].join(" + "),
			abilities: [...attribs],
			predefinedKey,
		};
	}

	static _getUnarmoredDefenseEffectSideTuples ({actor, feature, img}) {
				if (feature.effectsRaw?.length) return [];

		if (!this._isUnarmoredDefense(feature)) return [];

		const unarmoredDefenseMeta = this._getUnarmoredDefenseMeta(feature);
		if (!unarmoredDefenseMeta) return [];

		if (unarmoredDefenseMeta.predefinedKey) {
			return UtilActiveEffects.getExpandedEffects(
				[
					{
						name: "Unarmored Defense",
						changes: [
							{
								key: "system.attributes.ac.calc",
								mode: "OVERRIDE",
								value: unarmoredDefenseMeta.predefinedKey,
							},
						],
						transfer: true,
					},
				],
				{
					actor,
					img,
					parentName: feature.name,
				},
				{
					isTuples: true,
				},
			);
		}

		return UtilActiveEffects.getExpandedEffects(
			[
				{
					name: "Unarmored Defense",
					changes: [
						{
							key: "system.attributes.ac.calc",
							mode: "OVERRIDE",
							value: "custom",
						},
					],
					transfer: true,
				},
				{
					name: "Unarmored Defense",
					changes: [
						{
							key: "system.attributes.ac.formula",
							mode: "UPGRADE",
							value: unarmoredDefenseMeta.formula,
						},
					],
					transfer: true,
				},
			],
			{
				actor,
				img,
				parentName: feature.name,
			},
			{
				isTuples: true,
			},
		);
	}

	static async _pGetClassSubclassFeatureItem (feature, opts) {
		opts = opts || {};

		let {type = null, actor} = opts;
		type = type || UtilEntityClassSubclassFeature.getEntityType(feature);

		const subclassNameLookup = await DataUtil.class.pGetSubclassLookup();

		const srdData = await CompendiumCache.pGetAdditionalDataDoc(
			type,
			feature,
			{
				isSrdOnly: true,
				keyProvider: UtilEntityClassSubclassFeature.getCompendiumCacheKeyProvider({subclassNameLookup}),
				taskRunner: opts.taskRunner,
			},
		);

		if (srdData) return this._pGetClassSubclassFeatureItem_fromSrd(feature, type, actor, srdData, opts);
		return this._pGetClassSubclassFeatureItem_other(feature, type, actor, opts);
	}

	static async _pGetClassSubclassFeatureItem_fromSrd (feature, type, actor, srdData, opts = {}) {
		const idObj = UtilFoundryId.getIdObj({id: feature._foundryId});

		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(feature, {isActorItem: actor != null})),
			description: await this.pGetEntryDescription(feature),
		});

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(feature, {propCompendium: type, taskRunner: opts.taskRunner});

		const consumeMeta = UtilDataConverter.getConsumeMeta({ent: feature, actor: opts.actor});
		if (consumeMeta.isConsumes && !consumeMeta.isFound) {
			opts.actorMultiImportHelper?.addMissingConsumes({
				ent: feature,
				id: idObj.id,
			});
		}

		const srdEffects = await this._SideDataInterface.pIsIgnoreSrdEffectsSideLoaded(feature) ? [] : MiscUtil.copyFast(srdData.effects || []);
		UtilActiveEffects.mutEffectsDisabledTransfer(srdEffects, "importClassSubclassFeature");

		const effectsSideTuples = UtilActiveEffects.getExpandedEffects(feature.effectsRaw, {actor, img, parentName: feature.name}, {isTuples: true});
		effectsSideTuples.push(...this._getUnarmoredDefenseEffectSideTuples({actor, feature, img}));
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importClassSubclassFeature", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		return {
			...idObj,
			name: translatedName,
			type: srdData.type,
			system: {
				...srdData.system,

				source: UtilDocumentSource.getSourceObjectFromEntity(feature),
				description: {value: translatedDescription, chat: ""},
				consume: consumeMeta.consume,

				...(feature.foundryAdditionalSystem || {}),
			},
			ownership: {default: 0},
			effects: UtilActiveEffects.getEffectsMutDedupeId([
				...srdEffects,
				...effectsSideTuples.map(it => it.effect),
			]),
			flags: {
				...translatedFlags,
				...this._getClassSubclassFeatureFlags(feature, type, opts),
				...(feature.foundryAdditionalFlags || {}),
			},
			img,
		};
	}

	static _getClassSubclassFeatureFlags (feature, type, opts) {
		opts = opts || {};

		const prop = UtilEntityClassSubclassFeature.getEntityType(feature);

		const out = {
			[SharedConsts.MODULE_ID]: {
				page: prop,
				source: feature.source,
				hash: UrlUtil.URL_TO_HASH_BUILDER[prop](feature),
			},
		};

		if (opts.isAddDataFlags) {
			out[SharedConsts.MODULE_ID].propDroppable = prop;
			out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
		}

		return out;
	}

	static async _pGetClassSubclassFeatureItem_other (feature, type, actor, opts) {
		const idObj = UtilFoundryId.getIdObj({id: feature._foundryId});

		const {typeType, typeSubtype} = this._getClassSubclassFeatureTypeTypSubtype({feature});

		const consumeMeta = UtilDataConverter.getConsumeMeta({ent: feature, actor: opts.actor});
		if (consumeMeta.isConsumes && !consumeMeta.isFound) {
			opts.actorMultiImportHelper?.addMissingConsumes({
				ent: feature,
				id: idObj.id,
			});
		}

		const img = null;//await this._ImageFetcher.pGetSaveImagePath(feature, {propCompendium: type, taskRunner: opts.taskRunner});

		const effectsSideTuples = UtilActiveEffects.getExpandedEffects(feature.effectsRaw, {actor, img, parentName: feature.name}, {isTuples: true});
		effectsSideTuples.push(...this._getUnarmoredDefenseEffectSideTuples({actor, feature, img}));
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importClassSubclassFeature", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		return this._pGetItemActorPassive(
			feature,
			{
				...idObj,
				isActorItem: opts.isActorItem,
				mode: "player",
				renderDepth: 0,
				fvttType: "feat",
				typeType,
				typeSubtype,
				img,
				fvttSource: UtilDocumentSource.getSourceObjectFromEntity(feature),
				requirements: [feature.className, feature.level, feature.subclassShortName ? `(${feature.subclassShortName})` : ""].filter(Boolean).join(" "),
				additionalSystem: feature.foundryAdditionalSystem,
				foundryFlags: this._getClassSubclassFeatureFlags(feature, type, opts),
				additionalFlags: feature.foundryAdditionalFlags,
				effects: UtilActiveEffects.getEffectsMutDedupeId(effectsSideTuples.map(it => it.effect)),
				actor,
				consumeType: consumeMeta.consume.type,
				consumeTarget: consumeMeta.consume.target,
				consumeAmount: consumeMeta.consume.amount,
			},
		);
	}

		static _isFeatureSubtypeChannelDivinity (feature) {
		return feature.name.toLowerCase().startsWith("channel divinity:")
			|| feature.consumes?.name === "Channel Divinity";
	}

	static _getClassSubclassFeatureTypeTypSubtype ({feature}) {
		const out = {
			typeType: "class",
			typeSubtype: undefined,
		};

		if (this._isFeatureSubtypeChannelDivinity(feature)) {
			out.typeSubtype = "channelDivinity";
			return out;
		}

		if (feature.consumes?.name === "Ki") {
			out.typeSubtype = "ki";
			return out;
		}

		if (feature.consumes?.name === "Psionic Energy Die") {
			out.typeSubtype = "psionicPower";
			return out;
		}

		if (/\bExtra Attack\b/.test(feature.name)) {
			out.typeSubtype = "multiattack";
			return out;
		}

								
		return out;
	}
}

DataConverterClassSubclassFeature._UNARMORED_DEFENSE_BARBARIAN = new Set(["dex", "con"]);
DataConverterClassSubclassFeature._UNARMORED_DEFENSE_MONK = new Set(["dex", "wis"]);

class DataConverterFeat extends DataConverterFeature {
    static _configGroup = "importFeat";

    static _SideDataInterface = SideDataInterfaceFeat;
    //TEMPFIX static _ImageFetcher = ImageFetcherFeat;

    static async pGetDereferencedFeatureItem(feature) {
        if (feature.entries)
            return MiscUtil.copy(feature);

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](feature);
        return DataLoader.pCacheAndGet(UrlUtil.PG_FEATS, feature.source, hash, {
            isCopy: true
        });
    }

    static async pGetInitFeatureLoadeds(feature, {actor=null}={}) {
        const uid = DataUtil.proxy.getUid("feat", feature, {
            isMaintainCase: true
        });
        const asFeatRef = {
            feat: uid
        };
        await PageFilterClassesFoundry.pInitFeatLoadeds({
            feat: asFeatRef,
            raw: feature,
            actor
        });
        return asFeatRef;
    }

    static async pGetDocumentJson(feat, opts) {
        opts = opts || {};
        if (opts.actor)
            opts.isActorItem = true;

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        const fluff = opts.fluff || await Renderer.feat.pGetFluff(feat);

        const cpyFeat = Charactermancer_Feature_Util.getCleanedFeature_tmpOptionalfeatureList(feat);

        const content = await UtilDataConverter.pGetWithDescriptionPlugins(()=>{
            const fluffRender = fluff?.entries?.length ? Renderer.get().setFirstSection(true).render({
                type: "entries",
                entries: fluff?.entries
            }) : "";

            const ptCategoryPrerequisite = Renderer.feat.getJoinedCategoryPrerequisites(cpyFeat.category, Renderer.utils.prerequisite.getHtml(cpyFeat.prerequisite), );
            const ptRepeatable = Renderer.utils.getRepeatableHtml(cpyFeat);

            Renderer.feat.initFullEntries(cpyFeat);
            const statsRender = `<div>
				${ptCategoryPrerequisite ? `<p>${ptCategoryPrerequisite}</p>` : ""}
				${ptRepeatable ? `<p>${ptRepeatable}</p>` : ""}
				${Renderer.get().setFirstSection(true).render({
                entries: cpyFeat._fullEntries || cpyFeat.entries
            }, 2)}
			</div>`;

            return `<div>${[fluffRender, statsRender].join("<hr>")}</div>`;
        }
        );

        //TEMPFIX
        /* const img = await this._ImageFetcher.pGetSaveImagePath(cpyFeat, {
            propCompendium: "feat",
            fluff,
            taskRunner: opts.taskRunner
        }); */

        const additionalData = await this._SideDataInterface.pGetDataSideLoaded(cpyFeat);
        const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(cpyFeat);

        const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({
            ent: cpyFeat,
            img,
            actor: opts.actor
        });
        effectsSideTuples.forEach(({effect, effectRaw})=>DataConverter.mutEffectDisabledTransfer(effect, "importFeat", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

        const out = this._pGetItemActorPassive(feat, {
            isActorItem: opts.isActorItem,
            mode: "player",
            img,
            fvttType: "feat",
            typeType: "feat",
            source: feat.source,
            actor: opts.actor,
            description: content,
            isSkipDescription: !Config.get(this._configGroup, "isImportDescription"),
            requirements: Renderer.utils.prerequisite.getHtml(cpyFeat.prerequisite, {
                isTextOnly: true,
                isSkipPrefix: true
            }),
            additionalData: additionalData,
            additionalFlags: additionalFlags,
            foundryFlags: this._getFeatFlags(cpyFeat, opts),
            effects: DataConverter.getEffectsMutDedupeId(effectsSideTuples.map(it=>it.effect)),
        }, );

        this._mutApplyDocOwnership(out, opts);

        return out;
    }

    static _getFeatFlags(feat, opts) {
        opts = opts || {};

        const out = {
            [SharedConsts.MODULE_ID]: {
                page: UrlUtil.PG_FEATS,
                source: feat.source,
                hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](feat),
            },
        };

        if (opts.isAddDataFlags) {
            out[SharedConsts.MODULE_ID].propDroppable = "feat";
            out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
        }

        return out;
    }
}

class DataConverterItem extends DataConverter {
	static _configGroup = "importItem";

	static _SideDataInterface = SideDataInterfaceItem;
	//static _ImageFetcher = ImageFetcherItem;

	static async pGetActionWeaponDetails (
		{
			size,
			action,
			damageParts,
			isSiegeWeapon,
			isMagical = false,
			isInfiniteAmmo = false,
			isApplyWeaponDetails = false,
			isProficient = false,
			taskRunner = null,
			actorMultiImportHelper = null,
		},
	) {
		await Renderer.item.pPopulatePropertyAndTypeReference();

		await this._pGetActionWeaponDetails_initCaches({taskRunner});

		const out = {
			system: {
				"type.value": "natural",
			},
		};

		const weaponLookupName = Renderer.monsterAction.getWeaponLookupName(action);

		const weapon = isApplyWeaponDetails && DataConverterItem._WEAPON_DETAIL_CACHE[weaponLookupName]
			? MiscUtil.copyFast(DataConverterItem._WEAPON_DETAIL_CACHE[weaponLookupName])
			: null;

		if (weapon) {
			const itemData = await this.pGetDocumentJson(
				weapon,
				{
					size,
					isEquipped: true,
					quantity: 1,
					isActorItem: true,
					isInfiniteAmmo,
					isProficient,
					taskRunner,
					actorMultiImportHelper,
				},
			);
			Object.entries(itemData)
				.forEach(([prop, values]) => {
					if (["folder", "ownership", "sort"].includes(prop)) return;

					if (values == null) return out[prop] = values;
					if (typeof values !== "object") return out[prop] = MiscUtil.copyFast(values);

					out[prop] = out[prop] || {};
					Object.assign(out[prop], foundry.utils.flattenObject(values));
				});

						if (weapon._fvttImage) out.img = weapon._fvttImage;
		}

				if (
			damageParts.length > 1
			&& (
				(weapon?.property || []).some(uid => DataUtil.itemProperty.unpackUid(uid).abbreviation === Parser.ITM_PROP_ABV__VERSATILE)
				|| this._RE_IS_VERSATILE.test(JSON.stringify(action.entries || []))
			)
		) {
						const damageTypePrimary = damageParts[0][1];
			if (damageTypePrimary) {
				const ixDamagePartVersatile = damageParts.slice(1).findIndex(it => it[1] === damageTypePrimary);
				if (~ixDamagePartVersatile) {
					damageParts = MiscUtil.copyFast(damageParts);
										const cntVersatileParts = ixDamagePartVersatile + 1;
					const damagePartsVersatile = damageParts.splice(ixDamagePartVersatile + 1, cntVersatileParts);

																				out.system["damage.versatile"] = damagePartsVersatile[0][0];
					if (!(out.system.properties ||= []).includes("ver")) out.system.properties.push("ver");
				}
			}
		}
		
		if (isSiegeWeapon) out.system["type.value"] = "siege";

				out.system["damage.parts"] = damageParts;

				if (isMagical) {
			if (!(out.system.properties ||= []).includes("mgc")) out.system.properties.push("mgc");
		}
		
		return out;
	}

	static async _pGetActionWeaponDetails_initCaches ({taskRunner = null} = {}) {
		if (DataConverterItem._WEAPON_DETAIL_CACHE_INIT) return;

		await DataConverterItem._WEAPON_DETAIL_CACHE_LOCK.pLock();
		try {
			if (DataConverterItem._WEAPON_DETAIL_CACHE_INIT) return;

			console.log(...LGT, "Pre-caching item lookup...");

						const {item: items} = await Vetools.pGetItems();

			for (const item of items) {
				if ((item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null) === Parser.ITM_TYP_ABV__GENERIC_VARIANT) continue;

				const lowName = item.name.toLowerCase();
								const prefixBonusKey = lowName.replace(/^(.*?)( \+\d+$)/, (...m) => `${m[2].trim()} ${m[1].trim()}`);
								const suffixBonusKey = lowName.replace(/^(\+\d+) (.*?)$/, (...m) => `${m[2].trim()} ${m[1].trim()}`);
				const suffixBonusKeyComma = lowName.replace(/^(\+\d+) (.*?)$/, (...m) => `${m[2].trim()}, ${m[1].trim()}`);

				const itemKeys = [
					lowName,
					prefixBonusKey === lowName ? null : prefixBonusKey,
					suffixBonusKey === lowName ? null : suffixBonusKey,
					suffixBonusKeyComma === lowName ? null : suffixBonusKeyComma,
				].filter(Boolean);

				const cpy = MiscUtil.copyFast(item);
				const procFluff = await Renderer.item.pGetFluff(cpy);
				const foundryType = await this._pGetItemImporterType(cpy);
				cpy._fvttImage = await this._ImageFetcher.pGetImagePath(cpy, {fluff: procFluff, propCompendium: "item", foundryType, taskRunner});

				itemKeys.forEach(k => {
					if (!DataConverterItem._WEAPON_DETAIL_CACHE[k]) {
						DataConverterItem._WEAPON_DETAIL_CACHE[k] = cpy;
						return;
					}

										const existing = DataConverterItem._WEAPON_DETAIL_CACHE[k];
					if (
						!(existing.source === Parser.SRC_DMG || existing.source === Parser.SRC_PHB)
						&& SourceUtil.isNonstandardSource(existing.source)
					) {
						DataConverterItem._WEAPON_DETAIL_CACHE[k] = cpy;
					}
				});
			}

			console.log(...LGT, "Pre-caching complete.");

			DataConverterItem._WEAPON_DETAIL_CACHE_INIT = true;
		} finally {
			DataConverterItem._WEAPON_DETAIL_CACHE_LOCK.unlock();
		}
	}

		static async pGetDocumentJson (item, opts) {
		opts = opts || {};

		opts.actorType = opts.actorType || "character";

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		await Renderer.item.pPopulatePropertyAndTypeReference();

		const entriesWithoutNotes = this._getEntriesWithoutNotes(item._fullEntries || item.entries);
		const entriesStr = entriesWithoutNotes ? JSON.stringify(entriesWithoutNotes) : "";

				if (item._isItemGroup) return this._pGetItemItem_loot(item, opts, entriesStr);

		const srdData = await CompendiumCache.pGetAdditionalDataDoc(
			"item",
			item,
			{
				isSrdOnly: true,
				keyProvider: UtilEntityItem.getCompendiumCacheKeyProvider({isStrict: true}),
				taskRunner: opts.taskRunner,
			},
		);

		const out = srdData
			? await this._pGetItemItem_fromSrd(item, opts, srdData)
			: await this._pGetItemItem_notFromSrd(item, opts, entriesStr);

		if (opts.containerId) {
			MiscUtil.set(out, "system", "container", opts.containerId);
		}

		this._mutApplyDocOwnership(out, opts);

				const replacementMeta = await CompendiumCache.gGetReplacementDataDocMeta("item", item);
		if (replacementMeta) {
			const {docData: replacementData, uuid: replacementUuid} = replacementMeta;

			const toKeep = [
				["id"],
				["_id"],
				["system", "quantity"],
				["system", "attuned"],
				["system", "identified"],
				["system", "equipped"],
				["system", "proficient"],
				["system", "container"],
				["ownership"],
				["flags", SharedConsts.MODULE_ID],
			];

			if (
				opts.isInfiniteAmmo
				&& replacementData?.system?.consume?.type === "ammo"
			) {
				toKeep.push(["system", "consume"]);
			}

			toKeep.forEach(path => MiscUtil.getThenSetCopy(out, replacementData, ...path));

			IntegrationItemLinking.setFlags({replacementData, replacementUuid});

			return replacementData;
		}
		
		return out;
	}

	static _getEntriesWithoutNotes (entries) {
		if (!entries?.length) return null;

		entries = MiscUtil.copyFast(entries);

		const walker = MiscUtil.getWalker();
		entries = walker
			.walk(
				entries,
				{
					string: (str) => {
						const tagSplit = Renderer.splitByTags(str);
						const len = tagSplit.length;
						let out = "";
						for (let i = 0; i < len; ++i) {
							const s = tagSplit[i];
							if (!s || s.startsWith("{@note ")) continue;
							out += s;
						}
						return out;
					},
				},
			);

		entries = walker
			.walk(
				entries,
				{
					array: (arr) => arr.filter(it => typeof it !== "string" || it.length),
				},
			);

		return entries;
	}

	static async _pGetItemImporterType (item, {actorType = null} = {}) {
		const sideLoadedType = await this._SideDataInterface.pGetSideLoadedType(item, {actorType: actorType});
		if (sideLoadedType != null) return sideLoadedType;

		const fallback = UtilsFoundryItem.getFoundryItemType(item);
		if (!UtilDocumentItem.TYPES_ITEM.has(fallback)) throw new Error(`Unknown item type "${fallback}"!`);

		return fallback;
	}

	static _pGetItemItem_getWeaponType (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION || itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC) return "ammo";

		if (itemTypeAbv === Parser.ITM_TYP_ABV__MELEE_WEAPON || itemTypeAbv === Parser.ITM_TYP_ABV__RANGED_WEAPON) {
			if ((item.weaponCategory || "").toLowerCase() === "martial") return `martial${itemTypeAbv}`;
			else if ((item.weaponCategory || "").toLowerCase() === "simple") return `simple${itemTypeAbv}`;
		}

		return "improv";
	}

	static _pGetItemItem_getLootType (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (itemTypeAbv === Parser.ITM_TYP_ABV__TREASURE_ART_OBJECT) return "art";
		if (itemTypeAbv === Parser.ITM_TYP_ABV__TREASURE_GEMSTONE) return "gem";
		if (UtilEntityItem.isTreasureItem(item)) return "treasure";

				if (
			itemTypeAbv === Parser.ITM_TYP_ABV__TRADE_GOOD
		) return "material";

		if (
						itemTypeAbv === Parser.ITM_TYP_ABV__WAND
			|| itemTypeAbv === Parser.ITM_TYP_ABV__ROD
			|| itemTypeAbv === Parser.ITM_TYP_ABV__ADVENTURING_GEAR
			
			|| itemTypeAbv === Parser.ITM_TYP_ABV__FOOD_AND_DRINK
			|| itemTypeAbv === Parser.ITM_TYP_ABV__TACK_AND_HARNESS
		) return "gear";

		if (
			itemTypeAbv === Parser.ITM_TYP_ABV__OTHER 		) {
						if (
				["none", "unknown"].includes(item.rarity)
				&& !item.value
			) return "junk";
			return "gear";
		}

		return "gear";
	}

	static _getItemFlags (item, opts) {
		opts = opts || {};

		const out = {
			[SharedConsts.MODULE_ID]: {
				page: UrlUtil.PG_ITEMS,
				source: item.source,
				hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item),
			},
		};

		if (opts.isAddDataFlags) {
			out[SharedConsts.MODULE_ID].propDroppable = "item";
			out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
		}

		return out;
	}

	static async _pGetItemItem_notFromSrd (item, opts, entriesStr) {
		const importType = await this._pGetItemImporterType(item, opts);

		switch (importType) {
			case UtilDocumentItem.TYPE_WEAPON: return this._pGetItemItem_weapon(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_TOOL: return this._pGetItemItem_tool(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_CONSUMABLE: return this._pGetItemItem_consumable(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_EQUIPMENT: return this._pGetItemItem_equipment(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_CONTAINER: return this._pGetItemItem_container(item, opts, entriesStr);
			case UtilDocumentItem.TYPE_LOOT: return this._pGetItemItem_loot(item, opts, entriesStr);
			default: throw new Error(`Unhandled importer type "${importType}"`);
		}
	}

	static async _pGetItemItem_fromSrd (item, opts = {}, srdData) {
		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			description: await DataConverterItem._getItemItem_pGetItemDescription(item),
		});

		const foundryType = item.foundryType || srdData.type;
		const rangeMeta = this._getWeaponRange(item, {srdData});
		const {weight, price, rangeShort, rangeUnits, rangeLong} = this._pGetItemItem_getWeightPriceRange(item, opts.size, rangeMeta);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const {consumeType, consumeTarget, consumeAmount} = this._pGetItemItem_getAmmoConsumeDetails(item, opts);
		const {acValue, maxDexBonus} = UtilEntityItem.getAcInfo(item);
		const itemProperties = this._getItemProperties(item);

		const consume = {...(srdData.system.consume || {})};
		consume.type ||= consumeType;
		consume.target ||= consumeTarget;
		consume.amount ||= consumeAmount;

		const systemBase = {
			...srdData.system,

			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: translatedDescription, chat: ""},

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,
			quantity: opts.quantity != null ? opts.quantity : (item.quantity || 1),
			weight,
			price,
			attuned: isAttuned,
			identified: isIdentified,
			equipped: opts.isEquipped ?? isEquipped,
			rarity: this._getItemItem_getRarity(item),
			consume,
			target: this._getWeaponTargetDataDefault({srdData}),
			range: {value: rangeShort, long: rangeLong, units: rangeUnits},

			armor: {
				value: acValue,
				dex: maxDexBonus,
			},

			ability: opts.ability ?? srdData.system.ability,
			properties: itemProperties,

			attunement,
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		return {
			...UtilFoundryId.getIdObj(),
			name: translatedName,
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: foundry.utils.mergeObject(
				{
					...translatedFlags,
					...this._getItemFlags(item, opts),
				},
				additionalFlags,
			),
									effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static _pGetItemItem_getVersionCompatibleWeight ({weightLbs = 0}) {
		if (!UtilVersions.getSystemVersion().isVersionThreeTwoPlus) return Config.getMetricNumberWeight({configGroup: "importItem", originalValue: weightLbs, originalUnit: Parser.UNT_LBS});

		return {
			value: Config.getMetricNumberWeight({
				configGroup: "importItem",
				originalValue: weightLbs,
				originalUnit: Parser.UNT_LBS,
			}),
			units: Config.getMetricUnitWeight({
				configGroup: "importItem",
				originalUnit: Parser.UNT_LBS,
			}),
		};
	}

	static _pGetItemItem_getWeightPriceRange (item, size, {rangeShort, rangeLong, rangeUnits} = {}) {
		let weight = null;
		let price = null;
		let tmpValue = null;

		if (size == null || size === Parser.SZ_MEDIUM) {
			return {
				weight: this._pGetItemItem_getVersionCompatibleWeight({weightLbs: item.weight || 0}),
				price: !isNaN(item.value) ? UtilDocumentItem.getPrice({cp: item.value}) : null,
				rangeShort: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeShort || 0, originalUnit: "ft"}),
				rangeLong: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeLong || 0, originalUnit: "ft"}),
				rangeUnits: Config.getMetricUnitDistance({configGroup: "importItem", originalUnit: rangeUnits}),
			};
		}

		const weightValueScalingMode = Config.get("importCreature", "itemWeightAndValueSizeScaling");

		switch (weightValueScalingMode) {
						case ConfigConsts.C_CREATURE_ITEM_SCALING__NONE: {
				weight = item.weight || 0;
				tmpValue = item.value;
				break;
			}

						case ConfigConsts.C_CREATURE_ITEM_SCALING__MULTIPLICATIVE: {
				const weightMult = DataConverterItem._SIZE_TO_ITEM_WEIGHT_MULT[size] || 1;
				const valueMult = DataConverterItem._SIZE_TO_ITEM_VALUE_MULT[size] || 1;

				if (item.weight && !isNaN(item.weight)) {
					weight = Number(item.weight) * weightMult;
				}

				if (item.value && !isNaN(item.value)) {
					tmpValue = item.value * valueMult;
				}

				break;
			}

						case ConfigConsts.C_CREATURE_ITEM_SCALING__EXPONENTIAL: {
				const exponent = DataConverterItem._SIZE_TO_ITEM_WEIGHT_AND_VALUE_EXPONENT[size] || 1;

				if (item.weight && !isNaN(item.weight)) {
					weight = Math.floor(item.weight ** exponent);
				}

				if (item.value && !isNaN(item.value)) {
					const factor = item.value < 10 ? 1 : item.value < 100 ? 10 : 100;

										tmpValue = item.value / factor;

										tmpValue = Math.floor(tmpValue ** exponent);

										tmpValue *= factor;
				}

				break;
			}
		}

		if (tmpValue) price = UtilDocumentItem.getPrice({cp: tmpValue});

		return {
			weight: this._pGetItemItem_getVersionCompatibleWeight({weightLbs: weight || 0}),
			price,

						rangeShort: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeShort || 0, originalUnit: "ft"}),
			rangeLong: Config.getMetricNumberDistance({configGroup: "importItem", originalValue: rangeLong || 0, originalUnit: "ft"}),
			rangeUnits: Config.getMetricUnitDistance({configGroup: "importItem", originalUnit: rangeUnits}),
		};
	}

		static async _pGetItemItem_pGetAttunedIdentifiedEquipped (item, opts) {
		opts = opts || {};

						const isMundane = item.rarity === "none" || item.rarity === "unknown" || item._category === "basic";
		const isAttuned = !isMundane && !!item.reqAttune;

		const isEquipped = await this._pGetItemItem_pGetAttunedIdentifiedEquipped_equipped(item, opts);

		const kIsIdentified = opts.isActorItem
			? isMundane ? "mundaneActor" : "magicActor"
			: isMundane ? "mundane" : "magic"
		;

		const out = {
			isAttuned,
			isIdentified: true,//!!Config.get("importItem", "identified")[kIsIdentified],
			isEquipped,
		};

				if (!UtilVersions.getSystemVersion().isVersionThreeTwoPlus) {
						out.attunement = item.reqAttune
				? Config.get("importItem", opts.isActorItem ? "attunementTypeActor" : "attunementType")
				: CONFIG.DND5E.attunementTypes.NONE;

			return out;
		}

		out.attunement = item.reqAttune == null
			? "" 			: item.reqAttune === "optional"
								? "optional"
				: "required";

		return out;
	}

	static async _pGetItemItem_pGetAttunedIdentifiedEquipped_equipped (item, opts) {
				if (opts.containerId) return false;

		const importType = await this._pGetItemImporterType(item, opts);
		switch (importType) {
			case UtilDocumentItem.TYPE_WEAPON: return true;
			case UtilDocumentItem.TYPE_TOOL: return false;
			case UtilDocumentItem.TYPE_CONSUMABLE: return false;
			case UtilDocumentItem.TYPE_EQUIPMENT: return true;
			case UtilDocumentItem.TYPE_CONTAINER: return true;
			case UtilDocumentItem.TYPE_LOOT: return false;
			default: throw new Error(`Unhandled importer type "${importType}"`);
		}
	}

	static _getItemItem_pGetItemDescription (item) {
		if (!Config.get("importItem", "isImportDescription")) return "";

		return DescriptionRenderer.pGetWithDescriptionPlugins(
			() => this._getItemItem_pGetItemDescription_(item),
		);
	}

	static _getItemItem_pGetItemDescription_ (item) {
				const [damage, damageType, propertiesTxt] = Renderer.item.getDamageAndPropertiesText(item);
		const [typeRarityText, subTypeText, tierText] = Renderer.item.getTypeRarityAndAttunementText(item);

		const headerPart = Config.get("importItem", "isImportDescriptionHeader")
			? `<div>
				${Renderer.item.getTypeRarityAndAttunementHtml(typeRarityText, subTypeText, tierText)}
					<div class="ve-flex w-100">
						<div class="ve-col-4">${[Parser.itemValueToFull(item), Parser.itemWeightToFull(item)].filter(Boolean).join(", ").uppercaseFirst()}</div>
						<div class="ve-col-8 ve-text-right">${damage} ${damageType} ${propertiesTxt}</div>
					</div>
				</div>
			<hr>`
									: item.reqAttune && item.reqAttune !== true
				? `<div><i>${item._attunement}</i></div>`
				: "";

		const bodyPart = Renderer.item.getRenderedEntries(
			item,
			{
				isCompact: true,
				wrappedTypeAllowlist: Config.get("importItem", "isImportDescriptionHeader")
					? null
					: new Set([
												"type.SCF",
												"magicvariant",
					]),
			},
		);

		return `${headerPart}
		${bodyPart}`;
	}

	static _getItemItem_getItemUses (item) {
		let charges = null;

		if (item.charges) {
			if (isNaN(item.charges)) {
				const mDice = /{@dice (?<count>\d)+d(?<faces>\d+)\s*(?<bonus>[-+]\s*\d+)?}/i.exec(item.charges);
				if (mDice) {
					charges = (Number(mDice.groups.count) * Number(mDice.groups.faces)) + (mDice.groups.bonus ? Number(mDice.groups.bonus.replace(/\s*/g, "")) : 0);
				}
			} else charges = item.charges;
		}

		const usesPer = item.charges ? "charges" : UtilDataConverter.getFvttUsesPer(item.recharge);

		let usesRecovery = null;
		if (item.rechargeAmount) {
			if (typeof item.rechargeAmount === "number") {
				usesRecovery = item.rechargeAmount;
			} else {
				const mDice = /{@dice (?<formula>\d+d\d+\s*(?:[-+]\s*\d+)?)}/i.exec(item.rechargeAmount);
				if (mDice) {
					usesRecovery = mDice.groups.formula;
				}
			}
		}

		return {uses: charges, usesPer, usesRecovery};
	}

	static _getItemItem_getRarity (item) {
		const rawRarity = `${(item.rarity || "unknown")}`.toLowerCase().trim();

		switch (rawRarity) {
			case "common": return "common";
			case "uncommon": return "uncommon";
			case "rare": return "rare";
			case "very rare": return "veryRare";
			case "legendary": return "legendary";
			case "artifact": return "artifact";
			default: return "";
		}
	}

	static _getWeaponAbility (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION || itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC) return "dex";
		else if (itemTypeAbv === Parser.ITM_TYP_ABV__RANGED_WEAPON) return "dex";
		else if ((item.property || []).some(uid => DataUtil.itemProperty.unpackUid(uid).abbreviation === Parser.ITM_PROP_ABV__FINESSE)) return "dex"; 
		return "str";
	}

		static _getBaseItem ({item, foundryType}) {
				
		let baseNameLower;
		let baseSourceLower;

		if (item.baseItem && typeof item.baseItem === "string") {
			let [name, source] = item.baseItem.toLowerCase().trim().split("|").map(it => it.trim());
			source = source || Parser.SRC_DMG.toLowerCase();

			baseNameLower = name;
			baseSourceLower = source;
		}

		if (item._baseName && item._baseSource) {
			baseNameLower = item._baseName.toLowerCase();
			baseSourceLower = item._baseSource.toLowerCase();
		}

				if (baseSourceLower !== Parser.SRC_PHB.toLowerCase() && baseSourceLower !== Parser.SRC_DMG.toLowerCase()) return null;

		switch (foundryType) {
			case UtilDocumentItem.TYPE_WEAPON: {
				const key = this._getWeaponIdKey({nameLower: baseNameLower});
				if (CONFIG.DND5E.weaponIds?.[key]) return key;
				break;
			}

			case UtilDocumentItem.TYPE_EQUIPMENT: {
				const key = this._getArmorShieldIdKey({nameLower: baseNameLower});
				if (CONFIG.DND5E.shieldIds?.[key] || CONFIG.DND5E.armorIds?.[key]) return key;
				break;
			}

			case UtilDocumentItem.TYPE_TOOL: {
				const key = this._getToolIdKey({nameLower: baseNameLower});
				if (CONFIG.DND5E.toolIds?.[key]) return key;
				break;
			}
		}

		return null;
	}

	static _getWeaponRange (item, {srdData} = {}) {
		let rangeShort = 0;
		let rangeLong = 0;
		let rangeUnits = "ft";

		if (srdData) {
			rangeShort = MiscUtil.get(srdData, "system", "range", "value");
			rangeLong = MiscUtil.get(srdData, "system", "range", "long");
			rangeUnits = MiscUtil.get(srdData, "system", "range", "units") || rangeUnits;
		} else if (item.range) {
			const cleanRange = `${item.range}`.trim();
			const mRangeLong = /^(\d+)\/(\d+)$/i.exec(cleanRange);
			if (mRangeLong) {
				rangeShort = Number(mRangeLong[1]);
				rangeLong = Number(mRangeLong[2]);
			}

			const mRangeNum = /^(\d+)$/i.exec(cleanRange);
			if (mRangeNum) rangeShort = Number(mRangeNum[1]);
		} else if ((item.property || []).some(uid => DataUtil.itemProperty.unpackUid(uid).abbreviation === Parser.ITM_PROP_ABV__REACH)) { 			rangeShort = 10;
		} else { 			rangeShort = 5;
		}

		return {rangeShort, rangeLong, rangeUnits};
	}

	static _getItemProperties (item) {
		const out = new Set(
			(item.property || [])
				.map(uid => DataConverterItem._ITEM_PROP_MAP[DataUtil.itemProperty.unpackUid(uid).abbreviation])
				.filter(Boolean),
		);

		if (item._variantName === "Adamantine Weapon" || item._variantName === "Adamantine Armor" || item._variantName === "Adamantine Ammunition") out.add("ada"); 		if (item.focus) out.add("foc"); 		if (!Renderer.item.isMundane(item)) out.add("mgc"); 		if (item._variantName === "Silvered Weapon" || item._variantName === "Silvered Ammunition") out.add("sil"); 		if (item.firearm) out.add("fir"); 		if (item.stealth) out.add("stealthDisadvantage");
		if (item.containerCapacity?.weightless) out.add("weightlessContents");

		return [...out]
			.sort(SortUtil.ascSortLower);
	}

	static _getItemSystemType ({item, foundryType}) {
		const out = {
			value: "",
			baseItem: "",
		};

		const itemType = item.bardingType || item.type;
		const itemTypeAbv = itemType ? DataUtil.itemType.unpackUid(itemType).abbreviation : null;

		switch (foundryType) {
			case UtilDocumentItem.TYPE_WEAPON: {
				out.value = this._pGetItemItem_getWeaponType(item);
				out.baseItem = this._getBaseItem({item, foundryType});
				return out;
			}

			case UtilDocumentItem.TYPE_EQUIPMENT: {
				out.value = DataConverterItem._ITEM_TYPE_TO_ARMOR_TYPE[itemTypeAbv] || "trinket";
				out.baseItem = this._getBaseItem({item, foundryType});
				return out;
			}

			case UtilDocumentItem.TYPE_TOOL: {
				out.value = DataConverterItem._ITEM_TYPE_TO_TOOL_TYPE[itemTypeAbv] ?? "";
				out.baseItem = this._getBaseItem({item, foundryType});
				return out;
			}

			case UtilDocumentItem.TYPE_CONSUMABLE: {
				out.value = (item.poison ? "poison" : DataConverterItem._ITEM_TYPE_TO_CONSUMABLE_TYPE[itemTypeAbv]) || "";

				const subtype = this._getItemSystemType_getConsumableSubtype({item, systemTypeValue: out.value});
				if (subtype != null) out.subtype = subtype;

				return out;
			}

			case UtilDocumentItem.TYPE_LOOT: {
				out.value = this._pGetItemItem_getLootType(item);
				return out;
			}

			case UtilDocumentItem.TYPE_CONTAINER: {
				return out;
			}

			default: throw new Error("Unimplemented!");
		}
	}

	static _getItemSystemType_getConsumableSubtype ({item, systemTypeValue}) {
		switch (systemTypeValue) {
			case "poison": {
				if (!item.poisonTypes?.length) return null;

				const poisonType = item.poisonTypes[0];
								if (CONFIG.DND5E.consumableTypes.poison.subtypes[poisonType]) return poisonType;

				return null;
			}

			case "ammo": {
				if (item.arrow) return "arrow";
				if (item.bolt) return "crossbowBolt";
				if (item.bulletSling) return "slingBullet";
				if (item.needleBlowgun) return "blowgunNeedle";
				return null;
			}
		}

		return null;
	}

	static _getWeaponDamageModifiersFromBonuses ({item}) {
		return [
			item.bonusWeapon,
			item.bonusWeaponDamage,
		]
			.filter(Boolean)
			.join("");
	}

	static _getWeaponDamageAndFormula ({item, entriesStr}) {
		
		const parts = [];
		let formula = "";

		if (item.dmg1) {
			const dmg1 = `${item.dmg1}${this._getWeaponDamageModifiersFromBonuses({item})}+@mod`;
			parts.push([
				dmg1,
				item.dmgType ? Parser.dmgTypeToFull(item.dmgType) : "",
			]);
		}

				const additionalMetas = [];
		entriesStr
			.replace(new RegExp(`(?:deals?|dealing|takes?) an extra {@(?:dice|damage) (?<dmg>[^}]+)}(?: (?<dmgType>${Parser.DMG_TYPES.join("|")}))? damage`, "g"), (...m) => {
				additionalMetas.push({
					dmg: m.last().dmg,
					dmgType: m.last().dmgType ? m.last().dmgType : "",
				});
			});

		if (Config.get("importItem", "isUseOtherFormulaFieldForExtraDamage")) {
			additionalMetas.forEach(({dmg, dmgType}) => {
				const op = formula && !/^[-+*/]/.test(dmg.trim()) ? " + " : "";
				formula += `${op}${dmg}${dmgType ? `[${dmgType}]` : ""}`;
			});
		} else {
			parts.push(...additionalMetas.map(({dmg, dmgType}) => [dmg, dmgType]));
		}
		
		const dmg2 = item.dmg2
			? `${item.dmg2}${this._getWeaponDamageModifiersFromBonuses({item})}+@mod`
			: "";

		return {
			damage: {
				parts,
				versatile: dmg2,
			},
			formula,
		};
	}

	static async _pGetItemItem_weapon (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_WEAPON;
		const systemType = this._getItemSystemType({item, foundryType});
		const weaponAbility = this._getWeaponAbility(item);
		const rangeMeta = this._getWeaponRange(item);
		const {weight, price, rangeShort, rangeLong, rangeUnits} = this._pGetItemItem_getWeightPriceRange(item, opts.size, rangeMeta);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const {consumeType, consumeTarget, consumeAmount} = this._pGetItemItem_getAmmoConsumeDetails(item, opts);
		const itemProperties = this._getItemProperties(item);

		const {damage, formula} = this._getWeaponDamageAndFormula({item, entriesStr});

		const {uses, usesPer, usesRecovery} = this._getItemItem_getItemUses(item);
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = null;//await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,
			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			identified: isIdentified,
			equipped: opts.isEquipped ?? isEquipped,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			damage,
			range: {value: rangeShort, long: rangeLong, units: rangeUnits},
			ability: opts.ability ?? weaponAbility,
			properties: itemProperties,

			attunement,

			activation: {type: "action", cost: 1, condition: this._getItemItem_getActivationCondition({item, entriesStr})},
			duration: {value: 0, units: ""},
			target: this._getWeaponTargetDataDefault(),
			uses: {value: uses, max: uses, per: usesPer, recovery: usesRecovery},
			actionType: (item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null) === Parser.ITM_TYP_ABV__RANGED_WEAPON ? "rwak" : "mwak",
			attack: {
				bonus: item.bonusWeapon || item.bonusWeaponAttack || null,
			},
			chatFlavor: "",
			critical: {
				damage: item.bonusWeaponCritDamage ?? "",
				threshold: item.critThreshold ?? null,
			},

			formula,
			save: {ability: "", dc: 0, scaling: "spell"},
			consume: {type: consumeType, target: consumeTarget, amount: consumeAmount},

			hp: {value: 0, max: 0, dt: null, conditions: ""},
			speed: {value: null, conditions: ""},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_equipment (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_EQUIPMENT;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);

		const {acValue, maxDexBonus} = UtilEntityItem.getAcInfo(item);

		const {uses, usesPer, usesRecovery} = this._getItemItem_getItemUses(item);

		const itemProperties = this._getItemProperties(item);

		const activationCondition = this._getItemItem_getActivationCondition({item, entriesStr});

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,
			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			identified: isIdentified,
			equipped: opts.isEquipped ?? isEquipped,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			activation: {type: (activationCondition || uses || usesPer) ? "special" : "", cost: 0, condition: activationCondition},
			duration: {value: null, units: ""},
			target: {value: null, units: "", type: ""},
			range: {value: null, long: null, units: ""},
			uses: {value: uses, max: uses, per: usesPer, recovery: usesRecovery},
			actionType: "",
			attack: {bonus: null},
			chatFlavor: "",
			critical: {threshold: null, damage: ""},
			damage: {parts: [], versatile: ""},
			formula: "",
			save: {ability: "", dc: null, scaling: "spell"},
			armor: {
				value: acValue,
				dex: maxDexBonus,
			},
			strength: item.strength || null,
			consume: {type: "", target: null, amount: null},

			hp: {value: 0, max: 0, dt: null, conditions: ""},
			speed: {value: null, conditions: ""},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_container (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_CONTAINER;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const itemProperties = this._getItemProperties(item);

		const capacityValue = !item.containerCapacity
			? 0
			: item.containerCapacity.weight
				? item.containerCapacity.weight.reduce((a, b) => a + b, 0)
				: Math.max(...item.containerCapacity.item.map(itemToCount => Math.max(...Object.values(itemToCount))));

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,
			capacity: {
								type: item.containerCapacity?.weight ? "weight" : "items",
				value: capacityValue,
			},

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			damage: {parts: []},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_consumable (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_CONSUMABLE;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);

		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		let rollOnCons = "";
		let autoDestroy = false;

		entriesStr.replace(/if you expend[^.]+last charge[^.]+roll[^.]+{@dice ([^}]+)}(?:[^.]+)?\.(?:[^.]+)on a[^.]+\d+[^.]+destroyed/ig, (...m) => {
			rollOnCons = m[1];
			autoDestroy = true;
		});
		if (itemTypeAbv === Parser.ITM_TYP_ABV__SCROLL || itemTypeAbv === Parser.ITM_TYP_ABV__POTION) autoDestroy = true;

				const actionType = [Parser.ITM_TYP_ABV__AMMUNITION, Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC].includes(itemTypeAbv) ? "rwak" : null;
		let attackBonus = null;

		const dmgParts = [];
		if ([Parser.ITM_TYP_ABV__AMMUNITION, Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC].includes(itemTypeAbv) && (item.bonusWeapon || item.bonusWeaponDamage)) {
			attackBonus = Number(item.bonusWeapon || item.bonusWeaponAttack);

			dmgParts.push([
				this._getWeaponDamageModifiersFromBonuses({item}),
				null,
			]);
		}
		
		const {uses, usesPer, usesRecovery} = this._getItemItem_getItemUses(item);
		const itemProperties = this._getItemProperties(item);

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			activation: {type: "action", cost: 1, condition: this._getItemItem_getActivationCondition({item, entriesStr})},
			duration: {value: null, units: ""},
			target: {value: null, units: "", type: ""},
			range: {value: null, long: null, units: ""},
			uses: {value: uses, max: uses, per: usesPer, recovery: usesRecovery, autoUse: true, autoDestroy: autoDestroy},
			actionType,
			attack: {
				bonus: attackBonus,
			},
			chatFlavor: "",
			critical: {threshold: null, damage: ""},
			damage: {
				parts: dmgParts,
				versatile: "",
			},
			formula: rollOnCons, 			save: {ability: "", dc: null, scaling: "spell"},
			consume: {type: "", target: null, amount: null},
			hp: {value: 0, max: 0, dt: null, conditions: ""},
			speed: {value: null, conditions: ""},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_tool (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_TOOL;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const itemProperties = this._getItemProperties(item);

		let defaultAbil = DataConverterItem._ITEM_NAME_TO_DEFAULT_ABILITY[item.name] || "int";

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		const img = null; //await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			proficient: opts.isProficient === undefined ? UtilItems.PROFICIENCY_LEVELS.AUTO : opts.isProficient,

			ability: opts.ability ?? defaultAbil,
			properties: itemProperties,

			attunement,

			chatFlavor: "",
			damage: {parts: []},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static async _pGetItemItem_loot (item, opts, entriesStr) {
		const foundryType = item.foundryType || UtilDocumentItem.TYPE_LOOT;
		const systemType = this._getItemSystemType({item, foundryType});
		const {weight, price} = this._pGetItemItem_getWeightPriceRange(item, opts.size);
		const {isAttuned, isIdentified, isEquipped, attunement} = await this._pGetItemItem_pGetAttunedIdentifiedEquipped(item, opts);
		const itemProperties = this._getItemProperties(item);

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(item, {actorType: opts.actorType});

		//const img = await this._ImageFetcher.pGetSaveImagePath(item, {fluff: await Renderer.item.pGetFluff(item), propCompendium: "item", foundryType, taskRunner: opts.taskRunner});
		const img = null;
		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(item),
			description: {value: await DataConverterItem._getItemItem_pGetItemDescription(item), chat: ""},

			quantity: opts.quantity || item.quantity || 1,
			weight,
			price,
			attuned: isAttuned,
			equipped: opts.isEquipped ?? isEquipped,
			identified: isIdentified,
			rarity: this._getItemItem_getRarity(item),
			type: systemType,

			ability: opts.ability,
			properties: itemProperties,

			attunement,

			damage: {parts: []},
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(item, {systemBase, actorType: opts.actorType});

		return {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(item, {isActorItem: opts.isActorItem})),
			type: foundryType,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: {
				...this._getItemFlags(item, opts),
				...additionalFlags,
			},
			effects: await this._pGetItemEffects(item, img, opts),
		};
	}

	static _getWeaponTargetDataDefault ({srdData = null} = {}) {
		const fromSrd = MiscUtil.get(srdData, "system", "target");

		if (fromSrd?.value || fromSrd?.type) return fromSrd;

		switch (Config.get("import", "weaponTargetDefault")) {
			case ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__CREATURE_OR_OBJECT: return {value: 1, units: "", type: "creatureOrObject"};
			case ConfigConsts.C_IMPORT_WEAPON_TARGET_DEFAULT__CREATURE: return {value: 1, units: "", type: "creature"};
			default: return {value: 0, units: "", type: ""};
		}
	}

	static _pGetItemItem_getAmmoConsumeDetails (item, opts) {
		let consumeType = "";
		let consumeTarget = "";
		let consumeAmount = null;

		if (item.ammoType && !opts.isInfiniteAmmo) {
			consumeType = "ammo";
			consumeAmount = 1;

			if (opts.sheetItemsAmmo) {
				const [ammoTypeName, ammoTypeSource] = item.ammoType.toLowerCase().split("|").map(it => it.trim()).filter(Boolean);
				const cleanAmmoTypeSource = (ammoTypeSource || Parser.SRC_DMG).toLowerCase();
				const cleanAmmoTypeName = ammoTypeName.replace(/s+$/g, ""); 
				const ammoTypeItems = opts.sheetItemsAmmo.filter(sheetItem => {
					const cleanSheetItemName = sheetItem.name.toLowerCase().trim().replace(/s+$/g, ""); 					return cleanSheetItemName === cleanAmmoTypeName
						&& (
							!Config.get("import", "isStrictMatching")
							|| (UtilDocumentSource.getDocumentSource(sheetItem).source || "").toLowerCase() === cleanAmmoTypeSource
						);
				});

				if (ammoTypeItems.length) {
										consumeTarget = ammoTypeItems[0].id;
				}
			}
		}

		return {
			consumeType,
			consumeTarget,
			consumeAmount,
		};
	}

	static async _pGetItemEffects (item, img, opts) {
		opts = opts || {};

		if (!Config.get("importItem", "isAddActiveEffects")) return [];

		const importType = await this._pGetItemImporterType(item, opts);

		const sideDataSourceGenerated = new SideDataSourceGeneratedItem({
			ent: item,
			img,
			isEffectsDisabled: importType === UtilDocumentItem.TYPE_CONSUMABLE
				|| (opts.isEquipped != null && !opts.isEquipped),
		});

						const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples(
			{
				ent: item,
				img,
				actor: opts.actor,
			},
			{
				sideDataSourceGenerated,
				actorType: opts.actorType,
			},
		);

		return UtilActiveEffects.getEffectsMutDedupeId(effectsSideTuples.map(it => it.effect));
	}

	static _getGenericIdKey ({nameLower}) { return nameLower.replace(/[^a-z]+/g, ""); }
	static _getWeaponIdKey ({nameLower}) { return this._getGenericIdKey({nameLower}); }
	static _getArmorShieldIdKey ({nameLower}) { return DataConverterItem._ITEM_NAME_TO_ARMOR_ID_KEY[nameLower] || this._getGenericIdKey({nameLower}); }
	static _getToolIdKey ({nameLower}) { return DataConverterItem._ITEM_NAME_TO_TOOL_ID_KEY[nameLower] || this._getGenericIdKey({nameLower}); }

	static _getItemItem_getActivationCondition ({item, entriesStr}) {
		entriesStr = entriesStr || JSON.stringify(item.entries || "");

		let out = "";

		entriesStr.replace(/command word|command phrase/gi, (...m) => {
			out = m[0];
		});

		return out.uppercaseFirst();
	}

			static async pGetCurrencyItem (currency, opts) {
		opts = opts || {};

		const weight = Config.getMetricNumberWeight({configGroup: "importItem", originalValue: this._getCurrencyWeight(currency), originalUnit: Parser.UNT_LBS, toFixed: 3});
		const price = CurrencyUtil.getAsCopper(currency) / 100;

		const description = `<p>This collection of currency is made up of: ${Parser.getDisplayCurrency(currency)}</p>
		<hr class="hr-2">
		<p class="ve-muted italic">Drag-and-drop this item to an actor's sheet to add the currency to that actor.</p>`;

		const out = {
			...UtilFoundryId.getIdObj(),
			name: "Currency",
			type: "loot",
			system: {
				description: {value: description, chat: ""},

				type: {value: "treasure"},

				quantity: 1,
				weight,
				price,
			},
			img: "icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp",
			ownership: {default: 0},
			flags: {
				[SharedConsts.MODULE_ID]: {
					type: DataConverterItem.FLAG_TYPE__CURRENCY,
					currency: MiscUtil.copyFast(currency),
				},
			},
		};

		this._mutApplyDocOwnership(out, opts);

		return out;
	}

		static _getCurrencyWeight (currency) {
		return Object.entries(currency)
			.map(([coin, amount]) => 0.02 * (amount || 0))
			.reduce((a, b) => a + b, 0);
	}
}

DataConverterItem._WEAPON_DETAIL_CACHE_INIT = false;
DataConverterItem._WEAPON_DETAIL_CACHE = {};
DataConverterItem._WEAPON_DETAIL_CACHE_LOCK = new VeLock();

DataConverterItem.STACKABLE_FOUNDRY_ITEM_TYPES_IMPORT = [
	UtilDocumentItem.TYPE_CONSUMABLE,
	UtilDocumentItem.TYPE_LOOT,
];

DataConverterItem._ITEM_TYPE_TO_ARMOR_TYPE = {
	[Parser.ITM_TYP_ABV__HEAVY_ARMOR]: "heavy",
	[Parser.ITM_TYP_ABV__MEDIUM_ARMOR]: "medium",
	[Parser.ITM_TYP_ABV__LIGHT_ARMOR]: "light",
	[Parser.ITM_TYP_ABV__SHIELD]: "shield",
};
DataConverterItem._ITEM_TYPE_TO_CONSUMABLE_TYPE = {
	[Parser.ITM_TYP_ABV__AMMUNITION]: "ammo",
	[Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC]: "ammo",
	[Parser.ITM_TYP_ABV__POTION]: "potion",
	[Parser.ITM_TYP_ABV__SCROLL]: "scroll",
	[Parser.ITM_TYP_ABV__WAND]: "wand",
	[Parser.ITM_TYP_ABV__ROD]: "rod",
};
DataConverterItem._ITEM_TYPE_TO_TOOL_TYPE = {
	[Parser.ITM_TYP_ABV__ARTISAN_TOOL]: "art",
	[Parser.ITM_TYP_ABV__INSTRUMENT]: "music",
	[Parser.ITM_TYP_ABV__GAMING_SET]: "game",
};
DataConverterItem._ITEM_NAME_TO_DEFAULT_ABILITY = {
	"Alchemist's Supplies": "int",
	"Brewer's Supplies": "int",
	"Calligrapher's Supplies": "int",
	"Carpenter's Tools": "int",
	"Cartographer's Tools": "int",
	"Cobbler's Tools": "int",
	"Cook's Utensils": "wis",
	"Disguise Kit": "cha",
	"Forgery Kit": "int",
	"Glassblower's Tools": "int",
	"Herbalism Kit": "wis",
	"Jeweler's Tools": "int",
	"Leatherworker's Tools": "int",
	"Mason's Tools": "int",
	"Navigator's Tools": "wis",
	"Painter's Supplies": "int",
	"Poisoner's Kit": "wis",
	"Potter's Tools": "int",
	"Smith's Tools": "int",
	"Thieves' Tools": "dex",
	"Tinker's Tools": "int",
	"Weaver's Tools": "int",
	"Woodcarver's Tools": "int",
};

DataConverterItem._ITEM_PROP_MAP = {
	[Parser.ITM_PROP_ABV__AMMUNITION]: "amm",
	[Parser.ITM_PROP_ABV__AMMUNITION_FUTURISTIC]: "amm",
	[Parser.ITM_PROP_ABV__BURST_FIRE]: "", 	[Parser.ITM_PROP_ABV__FINESSE]: "fin",
	[Parser.ITM_PROP_ABV__HEAVY]: "hvy",
	[Parser.ITM_PROP_ABV__LIGHT]: "lgt",
	[Parser.ITM_PROP_ABV__LOADING]: "lod",
	[Parser.ITM_PROP_ABV__REACH]: "rch",
	[Parser.ITM_PROP_ABV__RELOAD]: "rel",
	[Parser.ITM_PROP_ABV__SPECIAL]: "spc",
	[Parser.ITM_PROP_ABV__THROWN]: "thr",
	[Parser.ITM_PROP_ABV__TWO_HANDED]: "two",
	[Parser.ITM_PROP_ABV__VERSATILE]: "ver",
};
DataConverterItem._SIZE_TO_ITEM_WEIGHT_MULT = {
	[Parser.SZ_FINE]: 0.5,
	[Parser.SZ_DIMINUTIVE]: 0.5,
	[Parser.SZ_TINY]: 0.5,
	[Parser.SZ_SMALL]: 1,
	[Parser.SZ_MEDIUM]: 1,
	[Parser.SZ_LARGE]: 2,
	[Parser.SZ_HUGE]: 4,
	[Parser.SZ_GARGANTUAN]: 8,
	[Parser.SZ_COLOSSAL]: 16,
	[Parser.SZ_VARIES]: 1,
};
DataConverterItem._SIZE_TO_ITEM_VALUE_MULT = {
	[Parser.SZ_FINE]: 0.25,
	[Parser.SZ_DIMINUTIVE]: 0.25,
	[Parser.SZ_TINY]: 0.25,
	[Parser.SZ_SMALL]: 1,
	[Parser.SZ_MEDIUM]: 1,
	[Parser.SZ_LARGE]: 4,
	[Parser.SZ_HUGE]: 16,
	[Parser.SZ_GARGANTUAN]: 64,
	[Parser.SZ_COLOSSAL]: 256,
	[Parser.SZ_VARIES]: 1,
};
DataConverterItem._SIZE_TO_ITEM_WEIGHT_AND_VALUE_EXPONENT = {
	[Parser.SZ_FINE]: 0.5,
	[Parser.SZ_DIMINUTIVE]: 0.5,
	[Parser.SZ_TINY]: 0.5,
	[Parser.SZ_SMALL]: 1,
	[Parser.SZ_MEDIUM]: 1,
	[Parser.SZ_LARGE]: 2,
	[Parser.SZ_HUGE]: 3,
	[Parser.SZ_GARGANTUAN]: 4,
	[Parser.SZ_COLOSSAL]: 5,
	[Parser.SZ_VARIES]: 1,
};

DataConverterItem._ITEM_NAME_TO_ARMOR_ID_KEY = {
	"half plate armor": "halfplate",
	"hide armor": "hide",
	"leather armor": "leather",
	"padded armor": "padded",
	"plate armor": "plate",
	"splint armor": "splint",
	"studded leather armor": "studded",
};
DataConverterItem._ITEM_NAME_TO_TOOL_ID_KEY = {
	"alchemist's supplies": "alchemist",
	"brewer's supplies": "brewer",
	"calligrapher's supples": "calligrapher",
	"playing card set": "card",
	"carpenter's tools": "carpenter",
	"cartographer's tools": "cartographer",
	"dragonchess set": "chess",
	"cobbler's tools": "cobbler",
	"cook's utensils": "cook",
	"dice set": "dice",
	"disguise kit": "disg",
	"forgery kit": "forg",
	"glassblower's tools": "glassblower",
	"herbalism kit": "herb",
	"jeweler's tools": "jeweler",
	"leatherworker's tools": "leatherworker",
	"mason's tools": "mason",
	"navigator's tools": "navg",
	"painter's supplies": "painter",
	"poisoner's kit": "pois",
	"potter's tools": "potter",
	"smith's tools": "smith",
	"thieves' tools": "thief",
	"tinker's tools": "tinker",
	"weaver's tools": "weaver",
	"woodcarver's tools": "woodcarver",
};

DataConverterItem.FLAG_TYPE__CURRENCY = "currency";

class DataConverterSpell extends DataConverter {
	static _configGroup = "importSpell";

	static _SideDataInterface = SideDataInterfaceSpell;
	/* static _ImageFetcher = ImageFetcherSpell; */

	static _getConfigKeyIsSpellPoints (opts) {
		if (opts.isActorItemNpc) return Config.getSpellPointsKey({actorType: "npc"});
		return Config.getSpellPointsKey({actorType: opts.actor?.type});
	}

	static isAllowSpellPoints (spellLevel, opts) {
		return opts.target == null
			&& opts.vetConsumes == null
			&& spellLevel !== 0
			&& Config.get("importSpell", this._getConfigKeyIsSpellPoints(opts)) !== ConfigConsts.C_SPELL_POINTS_MODE__DISABLED;
	}

	static _PassiveEntryParseStateSpell = class extends this._PassiveEntryParseState {
		constructor ({entry, img}, opts) {
			super({entry, img}, opts);

			let {
				school,
				materials,
				preparationMode,
				isPrepared,

				ability,
			} = opts;

			this.school = school;
			this.materials = materials;

			this.preparationMode = preparationMode;
			this.isPrepared = isPrepared;

			if (ability !== undefined) this.saveScaling = ability;

			this.isCustomDamageParts = false; 		}
	};

		static async pGetDocumentJson (spell, opts) {
		opts = opts || {};

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const state = new this._PassiveEntryParseStateSpell({entry: spell}, opts);
		await state.pInit({isSkipDescription: true, isSkipImg: true});

		const srdData = await CompendiumCache.pGetAdditionalDataDoc("spell", spell, {isSrdOnly: true, taskRunner: opts.taskRunner});

		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(`${UtilDataConverter.getNameWithSourcePart(spell, {isActorItem: opts.isActorItem})}${opts.nameSuffix || ""}`),
			description: await this._pGetDescription(spell),
		});

		const entriesStr = JSON.stringify(spell.entries);

		this._pGetSpellItem_mutPreparationMode({spell, opts, state});
		this._pGetSpellItem_mutActionType({spell, opts, entriesStr, state});
		this._pGetSpellItem_mutSchool({spell, opts, state});
		this._pGetSpellItem_mutMaterials({spell, opts, state});
		this._pGetSpellItem_mutDuration({spell, opts, state});
		this._pGetSpellItem_mutRangeTarget({spell, opts, state});
		this._pGetSpellItem_mutDamageAndFormula({spell, opts, entriesStr, srdData, state});
		this._pGetSpellItem_mutSave({spell, opts, state});
		this._pGetSpellItem_mutConsumes({spell, opts, state});
		this._pGetSpellItem_mutActivation({spell, opts, state});
		this._pGetSpellItem_mutProperties({spell, opts, state});

		/* const img = await this._ImageFetcher.pGetSaveImagePath(
			spell,
			{
				propCompendium: "spell",
				isAllowCustom: !spell.srd || Config.get("importSpell", "isUseCustomSrdIcons"),
				taskRunner: opts.taskRunner,
			},
		); */
		const img = null;
		this._pGetSpellItem_mut_srdData({spell, opts, srdData, state});

		const systemBase = {
			source: UtilDocumentSource.getSourceObjectFromEntity(spell),
			description: {value: translatedDescription, chat: ""},

			actionType: state.actionType,
			level: this._pGetSpellItem_getLevel(spell),
			school: state.school,
			properties: state.properties,
			materials: {
				value: state.materials,
				consumed: !!MiscUtil.get(spell, "components", "m", "consume"),
				cost: Math.round((MiscUtil.get(spell, "components", "m", "cost") || 0) / 100),
				supply: 0,
			},
			target: {
				value: state.targetValue,
				units: state.targetUnits,
				type: state.targetType,
				prompt: state.targetPrompt,
			},
			range: {value: state.rangeShort, units: state.rangeUnits, long: state.rangeLong},
			activation: {
				type: state.activationType,
				cost: state.activationCost,
				condition: state.activationCondition,
			},
			duration: {
				value: state.durationValue,
				units: state.durationUnit,
			},
			damage: {
				parts: state.damageParts,
				versatile: "",
			},
			scaling: {
				mode: state.cantripScaling ? "cantrip" : state.scaling ? "level" : "none",
				formula: state.cantripScaling || state.scaling || "",
			},
			save: {ability: state.saveAbility, dc: null, scaling: state.saveScaling},
			ability: state.ability,
			uses: {
				value: state.usesValue,
				max: state.usesMax,
				per: state.usesPer,
			},
			attack: {bonus: null},
			chatFlavor: "",
			critical: {threshold: null, damage: ""},
			formula: state.formula,
			preparation: {
				mode: state.preparationMode,
				prepared: !!state.isPrepared,
			},
			consume: {
				type: state.consumeType,
				target: state.consumeTarget,
				amount: state.consumeAmount,
				scale: state.consumeScale,
			},
			sourceClass: opts.parentClassName ? UtilDocumentItem.getNameAsIdentifier(opts.parentClassName) : null,
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(spell, {targetUnits: state.targetUnits, systemBase});
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(spell);

		const out = {
			...UtilFoundryId.getIdObj({id: state.id}),
			name: translatedName,
			type: "spell",
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			img,
			ownership: {default: 0},
			flags: foundry.utils.mergeObject(
				{
					...translatedFlags,
					...this._getSpellFlags(spell, opts),
				},
				additionalFlags,
			),
			effects: await this._pGetSpellEffects(spell, srdData, img),
		};

		this._pGetSpellItem_mut_summonData(out);

		this._mutApplyDocOwnership(out, opts);

				const replacementMeta = await CompendiumCache.gGetReplacementDataDocMeta("spell", spell);
		if (replacementMeta) {
			const {docData: replacementData, uuid: replacementUuid} = replacementMeta;

			[
				["id"],
				["_id"],
				["system", "preparation"],
				["system", "uses"],
				["system", "consume"],
				["system", "ability"],
				["system", "save", "scaling"],
				["ownership"],
				["flags", SharedConsts.MODULE_ID],
			].forEach(path => {
				MiscUtil.getThenSetCopy(out, replacementData, ...path);
			});

			IntegrationItemLinking.setFlags({replacementData, replacementUuid});

			return replacementData;
		}
		
		return out;
	}

	static _pGetSpellItem_mutPreparationMode ({spell, opts, state}) {
				if (
			Config.get("importSpell", this._getConfigKeyIsSpellPoints(opts)) === ConfigConsts.C_SPELL_POINTS_MODE__ENABLED
			&& spell.level !== 0
			&& (!state.preparationMode || state.preparationMode === "prepared" || state.preparationMode === "always")
		) {
			state.preparationMode = "atwill";
		}

		if (state.preparationMode === undefined) state.preparationMode = "prepared";
				if (spell.level === 0) state.preparationMode = "always";

		if (state.isPrepared === undefined) state.isPrepared = spell.level === 0;
	}

	static _pGetSpellItem_mutActionType ({spell, opts, entriesStr, state}) {
		const actionType = this._pGetSpellItem_getActionType({spell, entriesStr});

		if (state.actionType === undefined) state.actionType = actionType || "util";
	}

	static _pGetSpellItem_getActionType ({spell, entriesStr}) {
		if (spell.spellAttack?.includes("M")) return "msak";
		if (spell.spellAttack?.includes("R")) return "rsak";
		if (spell.miscTags?.includes("HL")) return "heal";
		if (spell.savingThrow?.length) return "save";
		if (spell.summonsCreature?.length || spell.miscTags?.includes("SMN")) return "summ";

		if (entriesStr.toLowerCase().includes("melee spell attack")) return "msak";
		if (entriesStr.toLowerCase().includes("ranged spell attack")) return "rsak";
	}

	static _pGetSpellItem_mutSchool ({spell, opts, state}) {
		state.school = UtilActors.VET_SPELL_SCHOOL_TO_ABV[spell.school] || "";
	}

	static _pGetSpellItem_mutMaterials ({spell, opts, state}) {
		state.materials = spell.components?.m
			? spell.components.m !== true
				? `${spell.components.m.text || spell.components.m}`
				: ""
			: "";
	}

	static _pGetSpellItem_mutDuration ({spell, opts, state}) {
		let durationValue = 0;
		let durationUnit = "";
		const duration0 = spell.duration[0];
		switch (duration0.type) {
			case "instant": durationUnit = "inst"; break;
			case "timed": {
				switch (duration0.duration.type) {
					case "turn": durationUnit = "turn"; durationValue = duration0.duration.amount; break;
					case "round": durationUnit = "round"; durationValue = duration0.duration.amount; break;
					case "minute": durationUnit = "minute"; durationValue = duration0.duration.amount; break;
					case "hour": durationUnit = "hour"; durationValue = duration0.duration.amount; break;
					case "day": durationUnit = "day"; durationValue = duration0.duration.amount; break;
					case "week": durationUnit = "day"; durationValue = duration0.duration.amount * 7; break;
					case "month": durationUnit = "month"; durationValue = duration0.duration.amount; break;
					case "year": durationUnit = "year"; durationValue = duration0.duration.amount; break;
				}
				break;
			}
			case "permanent": durationUnit = "perm"; break;
			case "special": durationUnit = "spec"; break;
		}

		if (state.durationValue === undefined) state.durationValue = durationValue;
		if (state.durationUnit === undefined) state.durationUnit = durationUnit;
	}

	static _pGetSpellItem_mutRangeTarget ({spell, opts, state}) {
		if (state.targetPrompt === undefined) state.targetPrompt = !!Config.get(this._configGroup, "isTargetTemplatePrompt");

		let rangeShort = 0;
		let rangeUnits = "";
		let targetValue = 0;
		let targetUnits = "";
		let targetType = "";
		switch (spell.range.type) {
			case Parser.RNG_SPECIAL: rangeUnits = "spec"; break;
			case Parser.RNG_POINT: {
				const dist = spell.range.distance;
				switch (dist.type) {
					case Parser.RNG_SELF: {
						targetUnits = "self";
						targetType = "self";
						rangeUnits = "self";
						break;
					}
					case Parser.RNG_UNLIMITED:
					case Parser.RNG_UNLIMITED_SAME_PLANE:
					case Parser.RNG_SIGHT:
					case Parser.RNG_SPECIAL: {
						targetUnits = "spec";
						rangeUnits = "spec";
						break;
					}
					case Parser.RNG_TOUCH: {
						targetUnits = "touch";
						rangeUnits = "touch";
						break;
					}
					case Parser.UNT_YARDS: {
						rangeShort = Config.getMetricNumberDistance({configGroup: "importSpell", originalValue: dist.amount, originalUnit: Parser.UNT_YARDS});
						rangeUnits = Config.getMetricUnitDistance({configGroup: "importSpell", originalUnit: Parser.UNT_YARDS});
						break;
					}
					case Parser.UNT_MILES: {
						rangeShort = Config.getMetricNumberDistance({configGroup: "importSpell", originalValue: dist.amount, originalUnit: Parser.UNT_MILES});
						rangeUnits = Config.getMetricUnitDistance({configGroup: "importSpell", originalUnit: Parser.UNT_MILES});
						break;
					}
					case Parser.UNT_FEET:
					default: {
						rangeShort = Config.getMetricNumberDistance({configGroup: "importSpell", originalValue: dist.amount, originalUnit: Parser.UNT_FEET});
						rangeUnits = Config.getMetricUnitDistance({configGroup: "importSpell", originalUnit: Parser.UNT_FEET});
						break;
					}
				}
				break;
			}
			case Parser.RNG_LINE:
			case Parser.RNG_CUBE:
			case Parser.RNG_CONE:
			case Parser.RNG_RADIUS:
			case Parser.RNG_SPHERE:
			case Parser.RNG_HEMISPHERE:
			case Parser.RNG_CYLINDER: {
				targetValue = Config.getMetricNumberDistance({configGroup: "importSpell", originalValue: spell.range.distance.amount, originalUnit: spell.range.distance.type});

				targetUnits = Config.getMetricUnitDistance({configGroup: "importSpell", originalUnit: spell.range.distance.type});

				if (spell.range.type === Parser.RNG_HEMISPHERE) targetType = "sphere";
				else targetType = spell.range.type; 			}
		}

		state.rangeShort = rangeShort;
		state.rangeUnits = rangeUnits;

		state.targetValue = targetValue;
		state.targetUnits = targetUnits;
		state.targetType = targetType;
	}

	static _pGetSpellItem_mutDamageAndFormula ({spell, opts, entriesStr, srdData, state}) {
		const {damageParts, cantripScaling, scaling} = this._pGetSpellItem_mutDamageAndFormula_getInitialParse({spell, opts, entriesStr, srdData, state});

		let formula = "";
				if (!damageParts.length && !state.isCustomDamageParts && !MiscUtil.get(srdData, "system", "damage", "parts")) {
			entriesStr.replace(this._getReDiceYourSpellcastingMod(), (...m) => {
				const [, dicePart, modPart] = m;

				formula = dicePart;
				if (modPart) formula = `${formula} + @mod`;
			});
		}

		if (state.damageParts === undefined) state.damageParts = damageParts;
		if (state.cantripScaling === undefined) state.cantripScaling = cantripScaling;
		if (state.scaling === undefined) state.scaling = scaling;

		if (state.formula === undefined) state.formula = formula;
	}

	static _pGetSpellItem_mutDamageAndFormula_getInitialParse ({spell, opts, entriesStr, srdData, state}) {
				if (spell.scalingLevelDice) return this._pGetSpellItem_mutDamageAndFormula_cantripScalingLevelDice({spell, opts, entriesStr, srdData, state});

		return this._pGetSpellItem_mutDamageAndFormula_other({spell, opts, entriesStr, srdData, state});
	}

	static _pGetSpellItem_mutDamageAndFormula_cantripScalingLevelDice ({spell, opts, entriesStr, srdData, state}) {
		const damageParts = [];

		const scalingLevelDice = [spell.scalingLevelDice].flat(); 
		const getLowestKey = scaling => Math.min(...Object.keys(scaling).map(k => Number(k)));
		const reDamageType = new RegExp(`(${UtilActors.VALID_DAMAGE_TYPES.join("|")})`, "i");

		damageParts.push(
			...scalingLevelDice
				.map(scl => {
					const lowKey = getLowestKey(scl.scaling);
					const lowDice = scl.scaling[lowKey];

					const mDamageType = reDamageType.exec(scl.label || "");

					return [
						(lowDice || "").replace(/{{spellcasting_mod}}/g, "@mod"),
						mDamageType ? mDamageType[1].toLowerCase() : null,
					];
				})
				.filter(Boolean),
		);

				const firstScaling = scalingLevelDice[0];
		const lowKey = getLowestKey(firstScaling.scaling);
		const cantripScaling = firstScaling.scaling[lowKey].replace(/{{spellcasting_mod}}/g, "@mod");

		return {
			damageParts,
			cantripScaling,
			scaling: null,
		};
	}

	static _pGetSpellItem_mutDamageAndFormula_other ({spell, opts, entriesStr, srdData, state}) {
		const damageParts = [];
		let scaling = null;

		let damageTuples = []; 
		const {strsMain} = this._pGetSpellItem_getPartitionedStrings({spell});

		if (spell.damageInflict?.length) {
			this._pGetSpellItem_parseAndAddDamage(strsMain, damageTuples);
		}

		if (spell.miscTags?.some(str => str === "HL")) {
			const healingTuple = ["", "healing"];

						entriesStr
				.replace(this._getReDiceYourSpellcastingMod(), (...m) => {
					const [, dicePart, modPart] = m;

					healingTuple[0] = dicePart;
					if (modPart) healingTuple[0] = `${healingTuple[0]} + @mod`;
				})
								.replace(/\bregains 1 hit point\b/, () => {
					if (healingTuple[0]) return;
					healingTuple[0] = "1";
				})
			;

			damageTuples.push(healingTuple);
		}

		const metaHigherLevel = this._pGetSpellItem_getHigherLevelMeta({spell, opts, damageTuples, isCustomDamageParts: state.isCustomDamageParts, scaling, preparationMode: state.preparationMode});
		if (metaHigherLevel) {
			damageTuples = metaHigherLevel.damageTuples;
			state.isCustomDamageParts = metaHigherLevel.isCustomDamageParts;
			scaling = metaHigherLevel.scaling;
		}

				if (!damageTuples.length) this._pGetSpellItem_parseAndAddDamage(strsMain, damageTuples, {isRelaxedTagChecking: true});

		damageParts.push(...damageTuples);

		return {
			damageParts,
			cantripScaling: this._pGetSpellItem_mutDamageAndFormula_other_getCantripScaling({spell, opts, entriesStr, srdData, state}),
			scaling,
		};
	}

	static _pGetSpellItem_mutDamageAndFormula_other_getCantripScaling ({spell, opts, entriesStr, srdData, state}) {
		if (spell.level !== 0) return null;

		const {strsMain, strCantripScaling} = this._pGetSpellItem_getPartitionedStrings({spell});
		if (!strCantripScaling) return null;

		const diceTiers = [];

				strCantripScaling.replace(
						/\({@(?:damage|dice) (?<mainDice>[^}]+)}(?: and {@(?:damage|dice) (?<otherDice>[^}]+)})?\)/g, (...m) => diceTiers.push(m.last().mainDice),
		);

		const reOutsideBrackets = /(?:^|[^(]){@(?:damage|dice) (?<dice>[^}]+)}(?:[^)]|$)/;

				if (diceTiers.length === 2) {
			const mInitialDice = reOutsideBrackets.exec(strCantripScaling);
			if (!mInitialDice) return null;
			diceTiers.unshift(mInitialDice.groups.dice);
		}

				if (diceTiers.length !== 3) return null;

				const baseVal = reOutsideBrackets.exec(strsMain.join("\n"));
		if (baseVal) return baseVal.groups.dice;

				return diceTiers[0];
	}

		static _pGetSpellItem_getPartitionedStrings ({spell}) {
		const walker = MiscUtil.getWalker({isBreakOnReturn: true, isNoModification: true, keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST});

		const strsMain = [];
		let strCantripScaling = null;
		walker.walk(
			spell.entries,
			{
				string: (str) => {
					if (
						!/\bwhen you reach 5th level\b/i.test(str)
						&& !/\bAt 5th level,/i.test(str)
					) {
						strsMain.push(str);
						return;
					}
					strCantripScaling = str;
					return true;
				},
			},
		);

		return {
			strsMain,
			strCantripScaling,
		};
	}

	static _pGetSpellItem_mutSave ({spell, opts, state}) {
		if (spell.savingThrow?.length) {
			state.saveAbility = spell.savingThrow[0].substring(0, 3).toLowerCase();
		}

		if (state.saveScaling === undefined) state.saveScaling = "spell";
	}

	static _pGetSpellItem_mutConsumes ({spell, opts, state}) {
		if (this._pGetSpellItem_mutConsumes_vetConsumes({spell, opts, state})) return;

		if (!this.isAllowSpellPoints(spell.level, opts)) return;

		const resource = Config.getSpellPointsResource({isValueKey: true});
		const consumeAmount = Parser.spLevelToSpellPoints(spell.level);

		if (resource === ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM) {
			if (state.consumeType === undefined) state.consumeType = "charges";
			if (state.consumeAmount === undefined) state.consumeAmount = consumeAmount;
			if (state.consumeTarget === undefined) state.consumeTarget = opts.spellPointsItemId;
			return;
		}

		if (state.consumeType === undefined) state.consumeType = "attribute";
		if (state.consumeAmount === undefined) state.consumeAmount = consumeAmount;
		if (state.consumeTarget === undefined) state.consumeTarget = resource;

					}

	static _pGetSpellItem_mutConsumes_vetConsumes ({spell, opts, state}) {
		if (!opts.vetConsumes) return false;

		const entFaux = {
			name: spell.name,
			source: spell.source,
			consumes: opts.vetConsumes,
		};

		const consumeMeta = UtilDataConverter.getConsumeMeta({
			ent: entFaux,
			actor: opts.actor,
		});

		if (!consumeMeta.isConsumes) return true;

		if (consumeMeta.isFound) {
			state.consumeType = consumeMeta.consume.type;
			state.consumeAmount = consumeMeta.consume.amount;
			state.consumeTarget = consumeMeta.consume.target;
			return true;
		}

		opts.actorMultiImportHelper?.addMissingConsumes({
			ent: entFaux,
			id: state.id,
		});

		return true;
	}

	static _pGetSpellItem_getLevel (spell) {
		if (!isNaN(spell.level) && spell.level >= 0 && spell.level <= 9) return Math.round(spell.level);
		if (!isNaN(spell.level)) return Math.clamped(Math.round(spell.level), 0, 9);
		return 0;
	}

	static _pGetSpellItem_mutActivation ({spell, opts, state}) {
		state.activationType = state.activationType || spell.time[0]?.unit;
		state.activationCost = state.activationCost || spell.time[0]?.number;
		state.activationCondition = state.activationCondition || Renderer.stripTags(spell.time[0]?.condition || "");

		if (!UtilCompat.isMidiQolActive() || state.activationType !== "reaction" || !state.activationCondition) return null;

		state.activationType = "reactionmanual";

		state.activationCondition
			.replace(/\bwhich you take when you take (?:[^?!.]+ )?damage\b/i, () => {
				state.activationType = "reactiondamage";
				return "";
			})
			.replace(/\bin response to being damaged\b/i, () => {
				state.activationType = "reactiondamage";
				return "";
			})

			.replace(/\bwhen you are hit\b/i, () => {
				state.activationType = "reaction";
				return "";
			})
			.replace(/\b(?:succeeds on|makes) an attack roll\b/i, () => {
				state.activationType = "reaction";
				return "";
			})
		;
	}

	static _pGetSpellItem_mutProperties ({spell, opts, state}) {
		if (state.properties !== undefined) return;

		state.properties = [];

		if (spell.components && spell.components.v) state.properties.push("vocal");
		if (spell.components && spell.components.s) state.properties.push("somatic");
		if (spell.components && spell.components.m) state.properties.push("material");
		if (spell.meta && spell.meta.ritual) state.properties.push("ritual");
		if (MiscUtil.get(spell, "duration", "0", "concentration")) state.properties.push("concentration");
	}

		static _pGetSpellItem_mut_srdData ({spell, opts, srdData, state}) {
		if (!srdData) return;

		state.targetValue = Config.getMetricNumberDistance({configGroup: "importSpell", originalValue: MiscUtil.get(srdData, "system", "target", "value"), originalUnit: MiscUtil.get(srdData, "system", "target", "units")}) || state.targetValue;
		state.targetUnits = Config.getMetricUnitDistance({configGroup: "importSpell", originalUnit: MiscUtil.get(srdData, "system", "target", "units")}) || state.targetUnits;
		state.targetType = MiscUtil.get(srdData, "system", "target", "type") || state.targetType;
		if (!state.isCustomDamageParts) state.damageParts = MiscUtil.get(srdData, "system", "damage", "parts") || state.damageParts;
		if (!state.cantripScaling && !state.scaling) state.scaling = MiscUtil.get(srdData, "system", "scaling", "formula");
	}

	static _pGetSpellItem_mut_summonData (docData) {
		this._pGetSpellItem_mut_summonBonuses(docData);
		this._pGetSpellItem_mut_summonProfiles(docData);
	}

	static _pGetSpellItem_mut_summonBonuses (docData) {
		const summonBonuses = foundry.utils.getProperty(docData, "system.summons.bonuses");
		if (!summonBonuses) return;

				["ac", "attackDamage", "hd", "healing", "hp", "saveDamage"]
			.forEach(prop => summonBonuses[prop] ||= "");
	}

	static _pGetSpellItem_mut_summonProfiles (docData) {
		const summonProfiles = foundry.utils.getProperty(docData, "system.summons.profiles");
		if (!summonProfiles) return;

				if (!Config.get("importSpell", "isAddSummonsProfiles")) {
			const ixsToRemove = summonProfiles
				.map((profile, ix) => {
					const uuid = profile?.uuid?.trim();
					if (!uuid) return null;

					if (UtilUuid.isCustomUuid(uuid)) return ix;

					return null;
				})
				.filter(ix => ix != null);

			ixsToRemove.reverse().forEach(ix => summonProfiles.splice(ix, 1));
		}

				summonProfiles.forEach(profile => profile._id ||= foundry.utils.randomID());
	}

	static _getSpellFlags (
		spell,
		{
			parentClassName,
			parentClassSource,
			parentSubclassName,
			parentSubclassSource,
		} = {},
	) {
		const out = {
			[SharedConsts.MODULE_ID]: {
				page: UrlUtil.PG_SPELLS,
				source: spell.source,
				hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](spell),
				propDroppable: "spell",
			},
		};

		if (parentClassName || parentClassSource || parentSubclassName || parentSubclassSource) {
			out[SharedConsts.MODULE_ID].parentClassName = parentClassName;
			out[SharedConsts.MODULE_ID].parentClassSource = parentClassSource;
			out[SharedConsts.MODULE_ID].parentSubclassName = parentSubclassName;
			out[SharedConsts.MODULE_ID].parentSubclassSource = parentSubclassSource;

			const identParentCls = UtilDocumentItem.getNameAsIdentifier(parentClassName);

						out[UtilCompat.MODULE_TIDY5E_SHEET] = {
								parentClass: [
					"artificer",
					"barbarian",
					"bard",
					"cleric",
					"druid",
					"fighter",
					"monk",
					"paladin",
					"ranger",
					"rogue",
					"sorcerer",
					"warlock",
					"wizard",
				].includes(identParentCls) ? identParentCls : "custom",
			};
			
			if (UtilCompat.isModuleMulticlassSpellbookFilterActive()) {
				out[UtilCompat.MODULE_MULTICLASS_SPELLBOOK_FILTER] = {parentClass: identParentCls};
			}
		}

				if (UtilCompat.isPlutoniumAddonAutomationActive()) {
			MiscUtil.set(out, "midiProperties", "magicdam", true);
			MiscUtil.set(out, "midiProperties", "magiceffect", true);
		}

		return out;
	}

	static async _pGetSpellEffects (spell, srdData, img) {
		const out = [];

		const effectsSrd = await this._SideDataInterface.pIsIgnoreSrdEffectsSideLoaded(spell) ? [] : MiscUtil.copyFast(srdData?.effects || []);
		effectsSrd.forEach(effect => effect.icon = img);
		UtilActiveEffects.mutEffectsDisabledTransfer(effectsSrd, "importSpell", {hintTransfer: false, hintDisabled: false});
		out.push(...effectsSrd);

		if (await this.pHasSpellSideLoadedEffects(null, spell)) {
			const effectsSideTuples = await this.pGetSpellItemEffectTuples(null, spell, null, {img});
			effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importSpell", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));
			out.push(...effectsSideTuples.map(it => it.effect));
		}

		await this._pGetSpellEffects_pMutAutomationFallback({out, spell, img});

		return UtilActiveEffects.getEffectsMutDedupeId(out);
	}

		static async _pGetSpellEffects_pMutAutomationFallback ({out, spell, img}) {
		if (out.length || !UtilCompat.isPlutoniumAddonAutomationActive() || !spell.conditionInflict?.length) return;

		const sideData = await this._SideDataInterface.pGetSideLoaded(spell);
		if (sideData?.effects != null) return;

		out.push(
			...spell.conditionInflict
				.map(condName => UtilAutomationConvenientEffects.getConvenientEffect({effectName: condName.toTitleCase(), img}))
				.filter(Boolean),
		);
	}

		static _pGetSpellItem_parseAndAddDamage (strsMain, damageTuples, {isRelaxedTagChecking = false} = {}) {
				const rePtTag = isRelaxedTagChecking ? `(?:damage|dice)` : "damage";
		const re = new RegExp(`{@${rePtTag} (?<dice>[^}]+)} (?:(?<type>[^ ]+)(, [^ ]+)*(,? or [^ ]+)? )?damage`, "gi");

		strsMain
			.forEach(str => {
				str.replace(re, (...m) => {
															damageTuples.push([
						m.last().dice,
												m.last().type || "",
					]);
				});
			});
	}

	static _getReDiceYourSpellcastingMod () {
				return /{@dice ([^}]+)}(\s*\+\s*your\s+spellcasting\s+ability\s+modifier)?/i;
	}

	static _pGetSpellItem_getHigherLevelMeta (
		{
			spell,
			opts,
			damageTuples,
			isCustomDamageParts,
			scaling,
			preparationMode,
		},
	) {
		if (!spell.entriesHigherLevel) return;

		const out = {
			damageTuples: MiscUtil.copyFast(damageTuples),
			isCustomDamageParts,
			scaling,
		};

		const reHigherLevel = /{@(?:scaledice|scaledamage) ([^}]+)}/gi;
		const resAdditionalNumber = [
			/\badditional (?<addPerLevel>\d+) for each (?:slot )?level\b/gi,
			/\bincreases by (?<addPerLevel>\d+) for each (?:slot )?level\b/gi,
		];

		let fnStr = null;

				const ixsScaled = new Set(); 
		const fnStrInnate = str => {
			str
				.replace(reHigherLevel, (...m) => {
					const [base] = m[1].split("|").map(it => it.trim());

					const [tag, text] = Renderer.splitFirstSpace(m[0].slice(1, -1));
					const scaleOptions = Renderer.parseScaleDice(tag, text);

					const ixDamageTuple = out.damageTuples.findIndex(it => (it[0] || "").trim().toLowerCase() === base.toLowerCase());
					if (!ixsScaled.has(ixDamageTuple) && ~ixDamageTuple) {
						const diceAtLevel = scaleOptions?.prompt?.options?.[opts.castAtLevel];
						if (diceAtLevel) {
							ixsScaled.add(ixDamageTuple);
							out.damageTuples[ixDamageTuple][0] += `+ ${diceAtLevel}`;
							out.isCustomDamageParts = true;
						}
					}
				});

			resAdditionalNumber.forEach(re => {
				str
					.replace(re, (...m) => {
						if (!out.damageTuples.length) return;

						const toAdd = opts.castAtLevel * Number(m.last().addPerLevel);
												out.damageTuples[0][0] += `+ ${toAdd}`;
						out.isCustomDamageParts = true;
					});
			});
		};
		
								const fnStrStandard = str => {
			if (out.scaling) return;

			str
				.replace(reHigherLevel, (...m) => {
					if (out.scaling) return;

					const [, progression, addPerProgress] = m[1].split("|");

					const progressionParse = MiscUtil.parseNumberRange(progression, 1, 9);
					const [p1, p2] = [...progressionParse].sort(SortUtil.ascSort);
					const baseLevel = Math.min(...progressionParse);

					
					out.scaling = addPerProgress;
				});

			resAdditionalNumber.forEach(re => {
				str
					.replace(re, (...m) => {
						if (out.scaling) return;

												out.scaling = `(@item.level - ${spell.level}) * ${m.last().addPerLevel}`;
					});
			});
		};
		
						if (opts.castAtLevel != null && opts.castAtLevel !== spell.level && out.damageTuples.length && preparationMode === "innate") {
			fnStr = fnStrInnate;
		} else {
			fnStr = fnStrStandard;
		}

		MiscUtil.getWalker({isNoModification: true})
			.walk(
				spell.entriesHigherLevel,
				{
					string: str => fnStr(str),
				},
			);

		return out;
	}

	static _pGetDescription (spell) {
		if (!Config.get("importSpell", "isImportDescription")) return "";

		return DescriptionRenderer.pGetWithDescriptionPlugins(async () => {
			const entries = await DataConverter.pGetEntryDescription(spell);
			const entriesHigherLevel = spell.entriesHigherLevel
				? await DataConverter.pGetEntryDescription(spell, {prop: "entriesHigherLevel"})
				: "";

			const stackPts = [entries, entriesHigherLevel];

			if (Config.get("importSpell", "isIncludeClassesInDescription")) {
				const fromClassList = Renderer.spell.getCombinedClasses(spell, "fromClassList");
				if (fromClassList?.length) {
					const [current] = Parser.spClassesToCurrentAndLegacy(fromClassList);
					stackPts.push(`<div><span class="bold">Classes: </span>${Parser.spMainClassesToFull(current, {isTextOnly: true})}</div>`);
				}
			}

			return stackPts.filter(Boolean).join("");
		});
	}

	static getActorSpell (actor, name, source) {
		if (!name || !source) return null;
		return actor.items && actor.items.find(it =>
			(it.name || "").toLowerCase() === name.toLowerCase()
			&& (
				!Config.get("import", "isStrictMatching")
				|| (UtilDocumentSource.getDocumentSource(it).source || "").toLowerCase() === source.toLowerCase()
			),
		);
	}

	static async pSetSpellItemIsPrepared (item, isPrepared) {
		if (!item) return;
		await UtilDocuments.pUpdateDocument(item, {system: {preparation: {prepared: isPrepared}}});
	}

	static async pHasSpellSideLoadedEffects (actor, spell) {
		return (await this._SideDataInterface.pGetEffectsRawSideLoaded(spell))?.length > 0;
	}

	static async pGetSpellItemEffectTuples (actor, spell, sheetItem, {img} = {}) {
		const effectsRaw = await this._SideDataInterface.pGetEffectsRawSideLoaded(spell);
		return UtilActiveEffects.getExpandedEffects(effectsRaw || [], {actor, sheetItem, parentName: spell.name, img}, {isTuples: true});
	}
}

class DataConverterOptionalfeature extends DataConverterFeature {
	static _configGroup = "importOptionalFeature";

	static _SideDataInterface = SideDataInterfaceOptionalfeature;
	/* static _ImageFetcher = ImageFetcherOptionalfeature; */

	static async pGetDereferencedFeatureItem (feature) {
				if (feature.entries) return MiscUtil.copyFast(feature);

		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES](feature);
		return DataLoader.pCacheAndGet(UrlUtil.PG_OPT_FEATURES, feature.source, hash, {isCopy: true});
	}

	static async pGetInitFeatureLoadeds (feature, {actor = null} = {}) {
		const uid = DataUtil.proxy.getUid("optionalfeature", feature, {isMaintainCase: true});
		const asFeatRef = {optionalfeature: uid};
						await PageFilterClassesFoundry.pInitOptionalFeatureLoadeds({optionalfeature: asFeatRef, raw: feature, actor});
		return asFeatRef;
	}

		static async pGetDocumentJson (optFeature, opts) {
		opts = opts || {};
		if (opts.actor) opts.isActorItem = true;

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const {DataPrimer} = await Promise.resolve().then(function () { return DataPrimer$1; });
		const cpyOptFeature = DataPrimer.getCleanedFeature_tmpOptionalfeatureList(optFeature);

		const srdData = await CompendiumCache.pGetAdditionalDataDoc(
			"optionalfeature",
			optFeature,
			{
				isSrdOnly: true,
				keyProvider: UtilEntityOptionalfeature.getCompendiumCacheKeyProvider(),
				taskRunner: opts.taskRunner,
			},
		);

		if (srdData) return this._pGetOptionalFeatureItem_fromSrd(cpyOptFeature, opts, srdData);
		return this._pGetOptionalFeatureItem_other(cpyOptFeature, opts);
	}

	static async _pGetOptionalFeatureItem_fromSrd (optFeature, opts = {}, srdData) {
		const idObj = UtilFoundryId.getIdObj({id: optFeature._foundryId});

		const fluff = opts.fluff || await Renderer.optionalfeature.pGetFluff(optFeature);

		const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
			translationData: this._getTranslationData({srdData}),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(optFeature, {isActorItem: opts.isActorItem})),
			description: await this._pGetGenericDescription(optFeature, "importOptionalFeature", {fluff}),
		});

		const consumeMeta = UtilDataConverter.getConsumeMeta({ent: optFeature, actor: opts.actor});
		if (consumeMeta.isConsumes && !consumeMeta.isFound) {
			opts.actorMultiImportHelper?.addMissingConsumes({
				ent: optFeature,
				id: idObj.id,
			});
		}

				const activationType = consumeMeta.consume?.type && !srdData.system?.activation?.type ? "special" : srdData.system?.activation?.type;

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(optFeature);

		const effects = [
			...(await this._SideDataInterface.pIsIgnoreSrdEffectsSideLoaded(optFeature) ? [] : MiscUtil.copyFast(srdData.effects || [])),
		];
		UtilActiveEffects.mutEffectsDisabledTransfer(effects, "importOptionalFeature");

		const effectsSideTuples = (await this._SideDataInterface.pGetEffectsSideLoadedTuples({ent: optFeature, img: srdData.img, actor: opts.actor}) || []);
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importOptionalFeature", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		const systemBase = {
			...srdData.system,

			activation: {type: activationType},

			source: UtilDocumentSource.getSourceObjectFromEntity(optFeature),
			description: {value: translatedDescription, chat: ""},
			requirements: this._getRequirementsString(optFeature),
			prerequisitesLevel: UtilDataConverter.getPrerequisiteLevelNumber({prereqs: optFeature.prerequisite}),
			consume: consumeMeta.consume,
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(optFeature, {systemBase});

		const out = {
			...idObj,
			name: translatedName,
			type: srdData.type,
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			ownership: {default: 0},
			/* img: await this._ImageFetcher.pGetSaveImagePath(optFeature, {propCompendium: "optionalfeature", fluff, taskRunner: opts.taskRunner}), */
			flags: {
				...translatedFlags,
				...this._getOptionalFeatureFlags(optFeature, opts),
				...additionalFlags,
			},
			effects: UtilActiveEffects.getEffectsMutDedupeId([
				...effects,
				...effectsSideTuples.map(it => it.effect),
			]),
		};

		this._mutApplyDocOwnership(out, opts);

		return out;
	}

	static async _pGetOptionalFeatureItem_other (optFeature, opts) {
		const idObj = UtilFoundryId.getIdObj({id: optFeature._foundryId});

		const fluff = opts.fluff || await Renderer.optionalfeature.pGetFluff(optFeature);

		const descriptionValue = await this._pGetGenericDescription(optFeature, "importOptionalFeature", {fluff});
		const {typeType, typeSubtype} = this._getOptionalfeatureTypeTypSubtype(optFeature);

		const consumeMeta = UtilDataConverter.getConsumeMeta({ent: optFeature, actor: opts.actor});
		if (consumeMeta.isConsumes && !consumeMeta.isFound) {
			opts.actorMultiImportHelper?.addMissingConsumes({
				ent: optFeature,
				id: idObj.id,
			});
		}

	/* 	const img = await this._ImageFetcher.pGetSaveImagePath(optFeature, {propCompendium: "optionalfeature", fluff, taskRunner: opts.taskRunner}); */
		const img = null;
		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(optFeature);

		const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({ent: optFeature, img, actor: opts.actor});
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, "importOptionalFeature", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		const out = this._pGetItemActorPassive(
			optFeature,
			{
				...idObj,
				isActorItem: opts.isActorItem,
				mode: "player",
			/* 	img, */
				fvttType: "feat",
				typeType,
				typeSubtype,
				source: optFeature.source,
				actor: opts.actor,
				description: descriptionValue,
				isSkipDescription: !Config.get(this._configGroup, "isImportDescription"),

				requirements: this._getRequirementsString(optFeature),
				prerequisitesLevel: UtilDataConverter.getPrerequisiteLevelNumber({prereqs: optFeature.prerequisite}),

				consumeType: consumeMeta.consume.type,
				consumeTarget: consumeMeta.consume.target,
				consumeAmount: consumeMeta.consume.amount,

				activationType: consumeMeta.consume?.type ? "special" : "",
				activationCost: null,
				activationCondition: "",

				pFnGetAdditionalSystem: async (entry, {systemBase}) => this._SideDataInterface.pGetSystemSideLoaded(entry, {systemBase}),
				additionalFlags: additionalFlags,
				foundryFlags: this._getOptionalFeatureFlags(optFeature, opts),
				effects: UtilActiveEffects.getEffectsMutDedupeId(effectsSideTuples.map(it => it.effect)),
			},
		);

		this._mutApplyDocOwnership(out, opts);

		return out;
	}

	static _getRequirementsString (optFeature) {
				if (optFeature._foundryData?.requirements) return optFeature._foundryData.requirements;

		return Renderer.utils.prerequisite.getHtml(
			UtilDataConverter.getCleanPrerequisites({prereqs: optFeature.prerequisite}),
			{
				isTextOnly: true,
				isSkipPrefix: true,
			},
		);
	}

	static _OPTIONALFEATURE_TYPE_TO_FVTT_CLASS_SUBTYPE = {
				"AI": "artificerInfusion", 		"AS": "arcaneShot", 		"AS:V1-UA": "arcaneShot", 		"AS:V2-UA": "arcaneShot", 		"ED": "elementalDiscipline", 		"EI": "eldritchInvocation", 		"FS:B": "fightingStyle", 		"FS:F": "fightingStyle", 		"FS:P": "fightingStyle", 		"FS:R": "fightingStyle", 								"MM": "metamagic", 		"MV": "maneuver", 		"MV:B": "maneuver", 		"MV:C2-UA": "maneuver", 						"PB": "pact", 		"RN": "rune", 											};

	static _getOptionalfeatureTypeTypSubtype (optFeature) {
		const out = {
			typeType: undefined,
			typeSubtype: undefined,
		};

		const [firstFeatureSubtype] = optFeature.featureType
			.map(ft => this._OPTIONALFEATURE_TYPE_TO_FVTT_CLASS_SUBTYPE[ft])
			.filter(Boolean);
		if (!firstFeatureSubtype) return out;

		out.typeType = "class";
		out.typeSubtype = firstFeatureSubtype;

		return out;
	}

	static _getOptionalFeatureFlags (optFeature, opts) {
		opts = opts || {};

		const out = {
			[SharedConsts.MODULE_ID]: {
				page: UrlUtil.PG_OPT_FEATURES,
				source: optFeature.source,
				hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES](optFeature),
			},
		};

		if (opts.isAddDataFlags) {
			out[SharedConsts.MODULE_ID].propDroppable = "optionalfeature";
			out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
		}

		return out;
	}
}
class DataConverterRace extends DataConverter {
	static _configGroup = "importRace";

	static _SideDataInterface = SideDataInterfaceRace;
	/* static _ImageFetcher = ImageFetcherRace; */

		static async pGetDocumentJson (race, opts) {
		opts = opts || {};
		if (opts.actor) opts.isActorItem = true;

		Renderer.get().setFirstSection(true).resetHeaderIndex();

		const img = null;//await this._ImageFetcher.pGetSaveImagePath(race, {fluff: await Renderer.race.pGetFluff(race), propCompendium: "race", taskRunner: opts.taskRunner});

		const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(race);

		const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({ent: race, img, actor: opts.actor});
		effectsSideTuples.forEach(({effect, effectRaw}) => UtilActiveEffects.mutEffectDisabledTransfer(effect, this._configGroup, UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

		const systemBase = {
			description: {value: await this._pGetRaceDescription(race, opts), chat: ""},
			source: UtilDocumentSource.getSourceObjectFromEntity(race),

			movement: this._getRaceMovement(race, opts),
			type: this._getRaceType(race, opts),
			senses: this._getRaceSenses(race, opts),

			advancement: this._getRaceAdvancement(race, opts),
		};

		const additionalSystem = await this._SideDataInterface.pGetSystemSideLoaded(race, {systemBase});

		const out = {
			...UtilFoundryId.getIdObj(),
			name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(race)),
			type: "race",
			system: foundry.utils.mergeObject(
				systemBase,
				(additionalSystem || {}),
			),
			effects: UtilActiveEffects.getEffectsMutDedupeId([
				...await this._pGetSpeedEffects(race.speed, {actor: opts.actor, iconEntity: race, iconPropCompendium: "race", taskRunner: opts.taskRunner}),
				...effectsSideTuples.map(it => it.effect),
			]),
			flags: {
				...this._getRaceFlags(race, opts),
				...additionalFlags,
			},
			img,
			ownership: {default: 0},
		};

		this._mutApplyDocOwnership(out, opts);

		return out;
	}

	static _pGetRaceDescription (race, opts) {
		if (!Config.get(this._configGroup, "isImportDescription")) return "";

		return DescriptionRenderer.pGetWithDescriptionPlugins(async () => {
			const ptSummary = `<table class="w-100 summary stripe-even">
				<tr>
					<th class="ve-col-4 ve-text-center">Ability Scores</th>
					<th class="ve-col-4 ve-text-center">Size</th>
					<th class="ve-col-4 ve-text-center">Speed</th>
				</tr>
				<tr>
					<td class="ve-text-center">${Renderer.getAbilityData(race.ability).asText}</td>
					<td class="ve-text-center">${(race.size || [Parser.SZ_VARIES]).map(sz => Parser.sizeAbvToFull(sz)).join("/")}</td>
					<td class="ve-text-center">${Parser.getSpeedString(race, {isMetric: Config.isUseMetricDistance({configGroup: this._configGroup})})}</td>
				</tr>
			</table>`;

			const ptFeatures = this._pGetRaceDescription_features(race, opts);

			const fluff = await Renderer.race.pGetFluff(race);
			let ptFluff = null;
			if (fluff) {
				ptFluff = Renderer.utils.getFluffTabContent({entity: race, isImageTab: false, fluff});
			}

			return `<div>
				${ptSummary}
				${ptFeatures}
				${ptFluff != null ? `<hr class="hr-1">${ptFluff}` : ""}
			</div>`;
		});
	}

	static _pGetRaceDescription_features (race, opts) {
				if (!opts.isActorItem) return Renderer.get().setFirstSection(true).render({type: "entries", entries: race.entries}, 1);

		if (!opts.actor || !opts.raceFeatureDataMetas?.length) return "";

		const ptsFeature = opts.raceFeatureDataMetas
			.map(({id, name}) => `@UUID[Actor.${opts.actor.id}.Item.${id}]{${name}}`);

		return `<div class="mt-2">${ptsFeature.map(f => `<p>${f}</p>`).join("")}</div>`;
	}

	static _getRaceMovement (race, opts) {
		if (race.speed == null) return {};
		return DataConverter.getMovement(race.speed, {configGroup: this._configGroup});
	}

	static _getRaceType (race, opts) {
		const subtype = race.creatureTypeTags?.length
			? race.creatureTypeTags.join("; ")
			: (race._baseName || race.name || "").toLowerCase();

		if (!race.creatureTypes?.length) {
			return {
				value: "humanoid",
				subtype,
				custom: "",
			};
		}

		if (race.creatureTypes.length === 1) {
			return {
				value: race.creatureTypes[0],
				subtype,
				custom: "",
			};
		}

		return {
			value: race.creatureTypes.join("/"),
			subtype,
			custom: "",
		};
	}

	static _getRaceSenses (race, opts) {
		const formDataSenses = Charactermancer_SenseSelect.getFormDataFromRace(race);
		return this._getFoundrySenseData({configGroup: this._configGroup, formData: formDataSenses});
	}

	static _getRaceAdvancement (race, opts) {
		return [
			...this._getRaceAdvancement_ability(race, opts),
			...this._getRaceAdvancement_size(race, opts),
			...this._getRaceAdvancement_skills(race, opts),
			...this._getRaceAdvancement_languages(race, opts),
		];
	}

		static _getRaceAdvancement_ability (race, opts) {
		const out = [];

		if (!race.ability?.length) return out;

				if (race.lineage === "VRGR") {
			out.push(UtilAdvancements.getAdvancementAbilityScoreImprovementVrgr());
			return out;
		}

		const advAbility = UtilAdvancements.getAdvancementAbilityScoreImprovement(race.ability);
		if (advAbility != null) out.push(advAbility);

		return out;
	}

	static _getRaceAdvancement_size (race, opts) {
		const advancement = UtilAdvancements.getAdvancementSize(race.size, {selectedSize: opts.size});
		if (advancement == null) return [];
		return [advancement];
	}

	static _getRaceAdvancement_skills (race, opts) {
		if (!opts.skillsChosenFvtt) return [];

				if (race.skillToolLanguageProficiencies) return [];

		const adv = UtilAdvancements.getAdvancementSkills({
			skillProficiencies: race.skillProficiencies,
			skillsChosenFvtt: Object.keys(opts.skillsChosenFvtt), 		});
		if (adv == null) return [];

		return [adv];
	}

	static _getRaceAdvancement_languages (race, opts) {
		if (!opts.languagesChosenFvtt) return [];

				if (race.skillToolLanguageProficiencies) return [];

		const adv = UtilAdvancements.getAdvancementLanguages({
			languageProficiencies: race.languageProficiencies,
			languagesChosenFvtt: opts.languagesChosenFvtt,
		});
		if (adv == null) return [];

		return [adv];
	}

	static _getRaceFlags (race, opts) {
		const out = {
			[SharedConsts.MODULE_ID]: {
				page: UrlUtil.PG_RACES,
				source: race.source,
				hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_RACES](race),
				propDroppable: "race",
				filterValues: opts.filterValues,
			},
		};

		if (opts.isActorItem) out[SharedConsts.MODULE_ID].isDirectImport = true;

		return out;
	}

	static isStubEntity (race) {
		return race.name === DataConverterRace.STUB_RACE.name && race.source === DataConverterRace.STUB_RACE.source;
	}

	static getRaceStub () {
		return MiscUtil.copyFast(DataConverterRace.STUB_RACE);
	}
}
DataConverterRace.STUB_RACE = {
	name: "Unknown Race",
	source: Parser.SRC_PHB,
	_isStub: true,
};