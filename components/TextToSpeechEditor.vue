<template>
  <div :class="wrapperClass">
    <b-field
      class="editor"
      :type="(errorRequired || errorMinLength || '') && 'is-danger'"
      :message="
        (errorRequired && mergedErrorMessages.requiredFieldError) ||
          (errorMinLength && mergedErrorMessages.minLengthError) ||
          null
      "
    >
      <template slot="label">
        {{ label }}
        <b-icon
          v-if="showLabelTooltip && labelTooltip"
          size="is-small"
          icon="help-circle"
          v-tooltip="labelTooltip"
        />
      </template>
      <div>
        <div class="menubar" v-if="showMenu && !readOnly">
          <div
            class="menubar__button-wrapper"
            :key="button.name"
            :ref="button.name"
            v-for="button in enabledButtons.filter(x => x !== undefined)"
          >
            <button
              class="menubar__button is-outlined"
              @click="button.command(button.commandArgs)"
              v-tooltip="button.tooltip"
              v-tooltip-delay="button.tooltipDelay || [800, 0]"
            >
              <b-icon class="menubar__icon" :icon="button.icon" />
            </button>
          </div>
        </div>
        <div class="control is-clearfix has-icons-right">
          <b-input
            ref="editor"
            type="textarea"
            v-model="contentValue"
            :maxlength="maxLength"
            :has-counter="false"
            :readonly="readOnly"
          />
          <small v-if="maxLength || minLength" class="help counter ">
            {{ charCount }}{{ maxLength && `/ ${maxLength}` }}
          </small>
        </div>
        <div
          class="menu-dropdown-list"
          v-show="popup"
          ref="MenuDropdownItemsList"
        >
          <template>
            <div
              v-for="menuCommand in menuCommands"
              :key="menuCommand.name"
              class="menu-dropdown-list__item"
              @click="menuDropdownItemClickHandler(menuCommand.commandArgs)"
            >
              {{ menuCommand.title }}
            </div>
          </template>
        </div>
      </div>
    </b-field>
  </div>
</template>

<script>
import _isFunction from 'lodash/isFunction';
import tippy from 'tippy.js';
import componentConfig from '@/shared/config/component-config';

const _insertTag = (tag, attrs, selection, selfClosing) => {
	return selfClosing
		? `${selection}<${tag} />`
		: `<${tag} ${attrs}>${selection}</${tag}>`;
};

export default {
	components: {},
	data () {
		return {
			wrapperClass: componentConfig.wrapperClass,
			editor: null,
			contentValue: this.content,
			charCount: this.content?.length,
			mergedButtonTooltips: {
				pause: 'Pause',
				sayAs: 'Say as',
				sayAsDate: 'Say as Date',
				speed: 'Speed',
				phoneme: 'Phoneme'
			},
			mergedMenuButtonTitles: {
				pauseWeak: 'Weak',
				pauseMedium: 'Medium',
				pauseStrong: 'Strong',
				pauseXStrong: 'Extra strong',
				sayAsSpellOut: 'Spell Out',
				sayAsNumber: 'Number',
				sayAsOrdinal: 'Ordinal (1-st, 2-nd)',
				sayAsDateMDY: 'mdy',
				sayAsDateDMY: 'dmy',
				sayAsDateYMD: 'ymd',
				sayAsDateMD: 'md',
				sayAsDateDM: 'dm',
				sayAsDateYM: 'ym',
				sayAsDateMY: 'my',
				sayAsDateD: 'd',
				sayAsDateM: 'm',
				sayAsDateY: 'y',
				speedXSlow: 'Extra Slow',
				speedSlow: 'Slow',
				speedMedium: 'Medium',
				speedFast: 'Fast',
				speedXFast: 'Extra Fast'
			},
			mergedErrorMessages: {
				requiredFieldError: 'This field is required',
				minLengthError: 'Text is too short'
			},
			enabledButtons: [],
			allButtons: {},
			errorRequired: false,
			errorMinLength: false,
			showDropdown: false,
			popup: null,
			menuCommands: {}
		};
	},
	props: {
		label: {
			type: String,
			default: () => 'SSML Content'
		},
		labelTooltip: {
			type: String,
			default: () => 'You can write ssml text below'
		},
		showLabelTooltip: {
			type: Boolean,
			default: () => true
		},
		/**
     * Initial content or content model HTML string
     * if you are planning to retrieve content in b-input>v-model like fashion rather than getting content on click/callback,
     * then listen to 'content-change' event and mutate passed model at parent level
     * see App.vue code for comprehensive example
     * @param {{String|Object}} Initial content or model HTML String or JSON - ProseMirror doc JSON representation
     */
		content: {
			type: String,
			default: () => ''
		},
		required: {
			type: Boolean,
			default: () => false
		},
		minLength: {
			type: Number,
			default: () => null
		},
		maxLength: {
			type: Number,
			default: () => null
		},
		buttonTooltips: {
			type: Object,
			default: () => ({})
		},
		menuButtonTitles: {
			type: Object,
			default: () => ({})
		},
		/**
     * @param {Object} Containing custom tooltip / button names
     * @param {String} errorMessages.requiredFieldError Message if input required and emtpy
     * @param {String} errorMessages.minLengthError Message if minLength is specified and length is less than minLength
     */
		errorMessages: {
			type: Object,
			default: () => ({})
		},
		/**
     * @param {String[]} Array of string with enabled menu buttons
     */
		menuButtons: {
			type: Array,
			default: () => ['pause', 'sayAs', 'sayAsDate', 'speed', 'phoneme']
		},
		readOnly: {
			type: Boolean,
			default: () => false
		},
		showMenu: {
			type: Boolean,
			default: () => true
		},
		/**
     * @param {Function} Function will be executed before setContent(both HTML or JSON) method is executed, if returns false content is not set
     */
		onSetContent: {
			type: Function,
			default: content => true
		}
	},
	created () {
		this.mergedButtonTooltips = {
			...this.mergedButtonTooltips,
			...this.buttonTooltips
		};
		this.mergedMenuButtonTitles = {
			...this.mergedMenuButtonTitles,
			...this.menuButtonTitles
		};
		this.mergedErrorMessages = {
			...this.mergedErrorMessages,
			...this.errorMessages
		};
	},
	mounted () {
		this.editor = this.$refs.editor.$refs.textarea;
		this.allButtons = {
			pause: {
				name: 'pause',
				icon: 'pause',
				command: this.openMenuDropdown,
				commandArgs: {
					node: () => this.$refs.pause,
					menuCommands: [
						{
							name: 'pause-weak',
							commandArgs: { tag: 'pause', arg: 'strength="weak"' },
							title: this.mergedMenuButtonTitles.pauseWeak
						},
						{
							name: 'pause-medium',
							commandArgs: { tag: 'pause', arg: 'strength="medium"' },
							title: this.mergedMenuButtonTitles.pauseMedium
						},
						{
							name: 'pause-strong',
							commandArgs: { tag: 'pause', arg: 'strength="strong"' },
							title: this.mergedMenuButtonTitles.pauseStrong
						},
						{
							name: 'pause-x-strong',
							commandArgs: { tag: 'pause', arg: 'strength="x-strong"' },
							title: this.mergedMenuButtonTitles.pauseXStrong
						}
					]
				},
				tooltip: this.mergedButtonTooltips.pause
			},
			sayAs: {
				name: 'sayAs',
				icon: 'volume-high',
				command: this.openMenuDropdown,
				commandArgs: {
					node: () => this.$refs.sayAs,
					menuCommands: [
						{
							name: 'say-as-spell-out',
							commandArgs: { tag: 'say-as', arg: 'interpret-as="characters"' },
							title: this.mergedMenuButtonTitles.sayAsSpellOut
						},
						{
							name: 'say-as-number',
							commandArgs: { tag: 'say-as', arg: 'interpret-as="cardinal"' },
							title: this.mergedMenuButtonTitles.sayAsNumber
						},
						{
							name: 'say-as-ordinal',
							commandArgs: { tag: 'say-as', arg: 'interpret-as="ordinal"' },
							title: this.mergedMenuButtonTitles.sayAsOrdinal
						}
					]
				},
				tooltip: this.mergedButtonTooltips.sayAs
			},
			sayAsDate: {
				name: 'sayAsDate',
				icon: 'calendar-today',
				command: this.openMenuDropdown,
				commandArgs: {
					node: () => this.$refs.sayAsDate,
					menuCommands: [
						{
							name: 'say-as-date-mdy',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="mdy"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateMDY
						},
						{
							name: 'say-as-date-dmy',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="dmy"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateDMY
						},
						{
							name: 'say-as-date-ymd',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="ymd"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateYMD
						},
						{
							name: 'say-as-date-md',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="md"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateMD
						},
						{
							name: 'say-as-date-dm',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="dm"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateDM
						},
						{
							name: 'say-as-date-ym',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="ym"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateYM
						},
						{
							name: 'say-as-date-my',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="my"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateMY
						},
						{
							name: 'say-as-date-d',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="d"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateD
						},
						{
							name: 'say-as-date-m',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="m"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateM
						},
						{
							name: 'say-as-date-y',
							commandArgs: {
								tag: 'say-as',
								arg: 'interpret-as="date" format="y"'
							},
							title: this.mergedMenuButtonTitles.sayAsDateY
						}
					]
				},
				tooltip: this.mergedButtonTooltips.sayAsDate
			},
			speed: {
				name: 'speed',
				icon: 'speedometer',
				command: this.openMenuDropdown,
				commandArgs: {
					node: () => this.$refs.sayAs,
					menuCommands: [
						{
							name: 'speed-x-slow',
							commandArgs: { tag: 'prosody', arg: 'rate="x-slow"' },
							title: this.mergedMenuButtonTitles.speedXSlow
						},
						{
							name: 'speed-slow',
							commandArgs: { tag: 'prosody', arg: 'rate="slow"' },
							title: this.mergedMenuButtonTitles.speedSlow
						},
						{
							name: 'speed-medium',
							commandArgs: { tag: 'prosody', arg: 'rate="medium"' },
							title: this.mergedMenuButtonTitles.speedMedium
						},
						{
							name: 'speed-fast',
							commandArgs: { tag: 'prosody', arg: 'rate="fast"' },
							title: this.mergedMenuButtonTitles.speedFast
						},
						{
							name: 'speed-x-fast',
							commandArgs: { tag: 'prosody', arg: 'rate="x-fast"' },
							title: this.mergedMenuButtonTitles.speedXFast
						}
					]
				},
				tooltip: this.mergedButtonTooltips.speed
			},
			phoneme: {
				name: 'phoneme',
				icon: 'ear-hearing',
				command: this.insertTagCommand,
				commandArgs: { tag: 'phoneme', arg: 'alphabet="ipa" ph=""' },
				tooltip: this.mergedButtonTooltips.phoneme
			}
		};
		for (let button of this.menuButtons) {
			this.enabledButtons.push(this.allButtons[button]);
		}
	},
	methods: {
		insertTagCommand ({ tag, arg }) {
			let ref = this.editor;

			let cursorStart = ref.selectionStart;
			let cursorEnd = ref.selectionEnd;
			const oldValue = ref.value;
			const len = oldValue.length;
			if (cursorStart === undefined) {
				cursorStart = 0;
				cursorEnd = 0;
			}

			const before = oldValue.substring(0, cursorStart);
			const selection = oldValue.substring(cursorStart, cursorEnd);
			const after = oldValue.substring(cursorEnd, len);
			const inserted = _insertTag(tag, arg, selection);
			const newVal = before + inserted + after;

			//If resulting newVal exceeds limit then do not paste tag
			if (this.maxLength && newVal.length > this.maxLength) return;

			this.contentValue = before + inserted + after;
			ref.focus();
			this.$nextTick().then(() => {
				ref.selectionStart = cursorStart + inserted.length;
				ref.selectionEnd = ref.selectionStart;
			});
		},
		menuDropdownItemClickHandler (args) {
			this.insertTagCommand(args);
			this.destroyPopup();
		},
		openMenuDropdown ({ node, menuCommands }) {
			if (this.popup) {
				this.destroyPopup();
			}
			this.menuCommands = [...menuCommands];
			this.popup = tippy(node(), {
				appendTo: () => document.body,
				interactive: true,
				allowHTML: true,
				content: this.$refs.MenuDropdownItemsList,
				showOnCreate: true,
				arrow: false,
				onHidden: () => {
					this.destroyPopup();
				},
				placement: 'bottom-start',
				duration: [0, 200]
			});
		},
		destroyPopup () {
			if (this.popup) {
				this.popup[0].destroy();
				this.popup = null;
			}
		},
		setContent (content) {
			if (_isFunction(this.onSetContent)) {
				if (this.onSetContent(content)) {
					this.contentValue = content;
				}
			} else {
				this.contentValue = content;
			}
		},
		getContent () {
			return this.contentValue;
		},
		isValid () {
			this.errorMinLength = this.contentValue.length < this.minLength;
			this.errorRequired = this.required && !this.contentValue;
			return !this.errorMinLength && !this.errorRequired;
		}
	},
	watch: {
		content () {
			if (this.contentValue !== this.content) {
				this.contentValue = this.content;
			}
		},
		contentValue () {
			if (this.contentValue !== this.content) {
				this.charCount = this.contentValue?.length;
				this.$emit('content-change', this.contentValue);
			}
		}
	}
};
</script>
<style lang="scss">
@import "@/assets/sass/bulma.scss";
@import "./../../shared/scss/variables";
@import "~tippy.js/dist/tippy.css";

$main-color: $backtracks-green;
$main-transparent-color: $backtracks-green-25pct;
.menubar {
  margin-bottom: 10px;
  transition: visibility 0.2s 0.4s, opacity 0.2s 0.4s;
  &__button-wrapper {
    display: inline-flex;
    margin-right: 4px;
    &:last-child {
      margin-right: 0;
    }
  }
  &__button.is-active {
    background-color: $backtracks-green-75pct;
    color: $white;
  }
  &__button {
    font-weight: 700;
    background: transparent;
    border: 0;
    color: $black;
    padding: 1px 5px;
    border-radius: 3px;
    cursor: pointer;
    &:hover {
      background-color: $backtracks-green;
      color: $white;
    }
    &:focus {
      outline: none;
    }
  }
  &__button.is-disabled {
    color: $gray;
    background-color: transparent;
    cursor: default;
    &:hover {
      background-color: transparent;
    }
  }
}

.menu-dropdown-list {
  padding-top: 2px;
  padding-bottom: 3px;
  &__item.is-selected {
    background-color: $backtracks-green;
  }
  &__item:not(.is-empty) {
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 5px;
    &:hover {
      background-color: $backtracks-green;
    }
  }
}

.editor {
  text-align: left;

  &__content {
    margin-bottom: 0 !important;
  }

  .textarea {
    padding: 6.25px;
  }

  .ProseMirror,
  .ProseMirror-focused {
    @extend .textarea;
    padding: 6.25px;
    height: 100%;
    overflow-y: auto;
    max-height: 600px !important;
    min-height: 120px !important;
  }

  .is-danger .ProseMirror {
    border-color: #ff3860;
  }

  .input:focus,
  .is-focused.input,
  .input:active,
  .is-active.input,
  .textarea:focus,
  .is-focused.textarea,
  .textarea:active,
  .is-active.textarea {
    border-color: $main-color;
    box-shadow: 0 0 0 0.125em $main-transparent-color !important;
  }
}
</style>
