// RPS のドメイン型(手・状態・結果の enum、ledger state、providers 型)は
// pkgs/cli と共有するため pkgs/shared に定義されている。ここは既存の
// `@/lib/rps-types` インポートパスを壊さないための再エクスポート。
export * from "shared";
