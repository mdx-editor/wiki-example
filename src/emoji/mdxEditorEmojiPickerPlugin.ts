import { realmPlugin, addComposerChild$ } from "@mdxeditor/editor"
import EmojiPickerPlugin from "./EmojiPickerPlugin"

export const mdxEditorEmojiPickerPlugin = realmPlugin({
  init: (realm) => {
    realm.pubIn({
      [addComposerChild$]: EmojiPickerPlugin
    })
  }
})
