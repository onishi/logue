// Jest 用: .sql ファイルをその内容を返す文字列モジュールとして扱う変換
module.exports = {
  process(sourceText) {
    return { code: `module.exports = ${JSON.stringify(sourceText)};` };
  },
};
