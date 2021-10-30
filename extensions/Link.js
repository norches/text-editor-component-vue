import { Mark, Plugin } from 'tiptap';
import { removeMark, updateMark } from 'tiptap-commands';
import { getMarkAttrs } from 'tiptap-utils';
import { InputRule } from 'prosemirror-inputrules';
import { Fragment, Slice } from 'prosemirror-model';

const linkPasteRule = (regexp, type, getAttrs) => {
	const handler = fragment => {
		const nodes = [];
		fragment.forEach(child => {
			if (child.isText) {
				const {
					text
				} = child;
				let pos = 0;
				let match;

				do {
					match = regexp.exec(text);

					if (match) {
						const attrs = getAttrs instanceof Function ? getAttrs(match[0]) : getAttrs;
						// match[2] - has 'http(s)://'
						// remove 'http(s)://' if originally had no protocol typed
						// match[3] - has slash after hostname, match[4] has something after hostname and slash
						let linkText = match[2] ? attrs.href : attrs.href.substring(8);
						linkText = (match[3] === '.' || !match[3]) && !match[4] ? linkText.slice(0, -1) : linkText;
						const start = match.index;
						const end = start + match[0].length;

						if (start > 0) {
							nodes.push(child.cut(pos, start));
						}
						let linkNode = child.cut(start, end);
						linkNode.text = linkText;
						nodes.push(linkNode.mark(type.create(attrs).addToSet(child.marks)));
						pos = end;
					}
				} while (match);

				if (pos < text.length) {
					nodes.push(child.cut(pos));
				}
			} else {
				nodes.push(child.copy(handler(child.content)));
			}
		});
		return Fragment.fromArray(nodes);
	};

	return new Plugin({
		props: {
			transformPasted: slice => new Slice(handler(slice.content), slice.openStart, slice.openEnd)
		}
	});
};

const linkMarkInputRule = (regexp, markType, getAttrs) => {
	return new InputRule(regexp, (state, match, start, end) => {
		const attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
		const {
			tr
		} = state;
		// match[2] - has 'http(s)://'
		// remove 'http(s)://' if originally had no protocol typed
		// match[3] - has '.' or '/' after hostname, match[4] has something after hostname and slash
		let linkText = match[2] ? attrs.href : attrs.href.substring(8);
		linkText = (match[3] === '.' || !match[3]) && !match[4] ? linkText.slice(0, -1) : linkText;
		//adding extra space so that user can escape link after space is pressed
		linkText += ' ';
		let startOld = start;
		let lengthNew = linkText.length;
		let lengthOld = match[1].length;

		let endNew = startOld + lengthNew;

		let markStart = start;

		tr.insertText(linkText, startOld);
		tr.delete(endNew, endNew + lengthOld);

		tr.addMark(markStart, endNew - 1, markType.create(attrs));
		tr.removeStoredMark(markType);
		return tr;
	});
};

export default class Link extends Mark {
	get name () {
		return 'link';
	}

	get defaultOptions () {
		return {
			openOnClick: true,
			target: null,
			enableConvert: true,
			onConvertLink: null
		};
	}

	get schema () {
		return {
			attrs: {
				href: {
					default: null
				},
				target: {
					default: null
				}
			},
			inclusive: false,
			parseDOM: [
				{
					tag: 'a[href]',
					getAttrs: dom => ({
						href: dom.getAttribute('href'),
						target: dom.getAttribute('target') })
				}
			],
			toDOM: node => ['a', {
				...node.attrs,
				rel: 'noopener noreferrer nofollow',
				target: this.options.target
			}, 0]
		};
	}

	commands ({ type }) {
		return attrs => {
			if (attrs.href) {
				return updateMark(type, attrs);
			}

			return removeMark(type);
		};
	}

	onConvertLinkWrapper = (regexArray) => {
		//adding https:// if it is missing
		if (!regexArray[0].match(/^[a-zA-Z]+:\/\//)) {
			regexArray[0] = 'https://' + regexArray[0];
		}
		regexArray[0] = this.options.onConvertLink(regexArray[0]);
		const url = new URL(regexArray[0]);
		url.hostname = url.hostname.replace(/\.+$/, '');
		return url.toString();
	};

	onConvertLinkWrapperString = (regexMatch) => {
		//adding https:// if it is missing
		if (!regexMatch.match(/^[a-zA-Z]+:\/\//)) {
			return this.options.onConvertLink('https://' + regexMatch);
		}
		return this.options.onConvertLink(regexMatch);
	};

	pasteRules ({ type }) {
		if (this.options.enableConvert) {
			return [
				linkPasteRule(
					/((?:(ftp|http|https):\/\/)?(?:www\.)?[-a-zA-Z0-9@:%.+~#=]{2,256}\.[a-zA-Z]{2,}([./])?([-a-zA-Z0-9@:%_+.~#?&/=]*))/g,
					type,
					url => ({ href: this.onConvertLinkWrapperString(url) })
				)
			];
		} else {
			return [];
		}
	}
	inputRules ({ type }) {
		if (this.options.enableConvert) {
			return [
				linkMarkInputRule(/((?:(ftp|http|https):\/\/)?(?:www\.)?[-a-zA-Z0-9@:%.+~#=]{2,256}\.[a-zA-Z]{2,}([./])?([-a-zA-Z0-9@:%_+.~#?&/=]*))[\s\n]$/g, type, url => ({ href: this.onConvertLinkWrapper(url) }))
			];
		} else {
			return [];
		}
	}

	get plugins () {
		if (!this.options.openOnClick) {
			return [];
		}

		return [
			new Plugin({
				props: {
					handleClick: (view, pos, event) => {
						const { schema } = view.state;
						const attrs = getMarkAttrs(view.state, schema.marks.link);

						if (attrs.href && event.target instanceof HTMLAnchorElement) {
							event.stopPropagation();
							window.open(attrs.href, attrs.target);
						}
					}
				}
			})
		];
	}
}
