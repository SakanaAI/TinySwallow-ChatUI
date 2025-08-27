# TinySwallowをiPhoneで使う

このガイドでは、[小規模言語モデルTinySwallow](https://sakana.ai/taid-jp/)をiPhoneで動かす方法を説明します。

## セットアップ手順
### Updates
* **[2025.8.27]:** LLMFarmは通常のApp Storeからダウンロードできず、[TestFlight](https://apps.apple.com/jp/app/testflight/id899247664)を経由してダウンロードする必要があります。また、[Section 3.の6](#3-llmfarmでの設定)につきまして、「ChatML」でなく「Custom」と選択してください。

### 1. アプリのダウンロード

まずは「LLMFarm」というアプリをApp Storeからダウンロードしてください。
[LLMFarmをダウンロード](https://apps.apple.com/ru/app/llm-farm/id6461209867?l=en-GB&platform=iphone)


### 2. モデルファイルのダウンロード

TinySwallowには2つのバージョンがあります：

- Q8バージョン：より正確な応答が可能ですが、やや遅めです（14.75トークン/秒）
  - [Q8をダウンロード](https://huggingface.co/SakanaAI/TinySwallow-1.5B-Instruct-GGUF/resolve/main/tinyswallow-1.5b-instruct-q8_0.gguf?download=true)

- Q5バージョン：Q8より精度は落ちますが、より速く動作します（19.89トークン/秒）
  - [Q5をダウンロード](https://huggingface.co/SakanaAI/TinySwallow-1.5B-Instruct-GGUF/resolve/main/tinyswallow-1.5b-instruct-q5_k_m.gguf?download=true)

※ブログのデモではQ8バージョンを使用しています

### 3. LLMFarmでの設定

1. ダウンロードしたLLMFarmアプリを開きます
2. 画面右上の＋ボタンをタップします
3. 「Basic」タブの「Model」セクションで「Select model」をタップします
4. 「import from file」から、先ほどダウンロードしたファイルを選択します
5. タイトルに「TinySwallow」と入力します
6. 「Settings template」をタップし、「ChatML」を選択します

### 4. 追加設定（任意）

以下の設定を変更することで、より良い結果が得られる場合があります：

「Sampling」タブで：
- Temperature: 0.7
- Top_k: 20

「Prompt」タブで以下のシステムプロンプトを追加できます：

```
[system](あなたは、Sakana AI株式会社が開発したTinySwallowです。小型ながら、誠実で優秀なアシスタントです。)
<|im_start|>user
{{prompt}}<|im_end|>
<|im_start|>assistant

```

### 5. 完了

「Save」をタップして保存すれば、チャットを開始できます！
