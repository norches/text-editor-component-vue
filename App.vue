<template>
	<div class="demo content">
		<h2>Text editor Component</h2>
		<h3>Basic Vue usage example</h3>
		<text-editor :minLength="10" :maxLength="4000" ref="textEditorRef" codeView :content="content" @content-change="handleChange"/>
		<div>Raw HTML: <pre>{{ content }}</pre></div>
		<button @click="getContentJSON">get JSON</button>
		<button @click="getContentText">get Text</button>
		<button @click="getContentHTML">get HTML</button>
		<button @click="submit">Send</button>

		<h2>Text To Speech editor Component</h2>
		<h3>Basic usage example</h3>
		<text-to-speech-editor :content="ssmlContent" @content-change="handleSsmlChange"/>
		<div><pre>{{ ssmlContent }}</pre></div>
	</div>
</template>

<script>
import TextEditor from '@/text-editor/components/TextEditor';
import TextToSpeechEditor from '@/text-editor/components/TextToSpeechEditor';
export default {
	components: {
		TextEditor,
		TextToSpeechEditor
	},
	data () {
		return {
			content: '',
			ssmlContent: ''
		};
	},
	computed: {
	},
	props: {
	},
	model: {
	},
	mounted () {
	},
	methods: {
		handleChange (content) {
			this.content = content;
		},
		submit () {
			if (this.$refs.textEditorRef.isValid()) {
				console.log('Submitted!');
				return;
			}
			console.log('Error :(');
		},
		getContentJSON () {
			console.log(this.$refs.textEditorRef.getContentJSON());
		},
		getContentText () {
			console.log(this.$refs.textEditorRef.getContentText());
		},
		getContentHTML () {
			console.log(this.$refs.textEditorRef.getContentHTML());
		},
		handleSsmlChange (content) {
			this.ssmlContent = content;
		}
	},
	watch: {
	}
};
</script>

<style lang="scss" scoped>
.demo {
	margin: 2em auto;
	text-align: center;
    width: 85%;
}
</style>
