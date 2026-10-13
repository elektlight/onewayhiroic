import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Dices, Shield, Zap, Coins, Users, Lock, Eye, EyeOff, 
  Sparkles, BookOpen, Compass, ChevronRight, UserCheck, RefreshCw, 
  Award, AlertTriangle, Sword, MessageSquare, Play, Trophy, MapPin, Search, LogOut, Trash2, CheckCircle2
} from 'lucide-react';

// Firebase Configuration Setup
const firebaseConfig = {
  apiKey: "AIzaSyB17Nnj4HR83mfD9xz4iYUx6H7t-yoNpso",
  authDomain: "onewayhero-b25be.firebaseapp.com",
  projectId: "onewayhero-b25be",
  storageBucket: "onewayhero-b25be.firebasestorage.app",
  messagingSenderId: "1004433634839",
  appId: "1:1004433634839:web:bf7b77214fb14434824e52",
  measurementId: "G-N5VRK1WYHZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'oneway-trpg-app';

// 地形データ
const TERRAIN_DATA = {
  草原: { name: '草原', effect: '特殊効果なし', icon: '🌿' },
  雪原: { name: '雪原', effect: 'PCの【ST】が減少するとき、さらに【ST】が1点減少', icon: '❄️' },
  砂漠: { name: '砂漠', effect: 'PCの【LIFE】が減少するとき、さらに【LIFE】が1点減少', icon: '🏜️' },
  火山: { name: '火山', effect: '「ファンブル表」のすべての効果に「溶岩に落ちかける。【LIFE】が1D6減少する」が加わる', icon: '🌋' },
  荒野: { name: '荒野', effect: '探索で施設が出現した場合、施設以外が出現するまでサイコロを振り直す', icon: '🪨' },
  山岳地帯: { name: '山岳地帯', effect: '進行で減少する【ST】が2増加する', icon: '⛰️' },
  遺跡群: { name: '遺跡群', effect: '探索でダンジョンが出現した場合、ダンジョン遭遇表を使用する回数を一回増やし、好きなもの１つを選択できる。', icon: '🏛️' },
  侵食地帯: { name: '侵食地帯', effect: '4日目以降にしか設置不可。出現するモンスター全ての【LIFE】が3増加し、【反撃ダメージ】が2増加する。', icon: '🕳️' }
};

// 日数＆2D6ロール結果による地形決定表
const TERRAIN_TABLES = {
  day1_2: { 2:'火山', 3:'遺跡群', 4:'雪原', 5:'雪原', 6:'草原', 7:'草原', 8:'草原', 9:'砂漠', 10:'砂漠', 11:'遺跡群', 12:'山岳地帯' },
  day3:   { 2:'火山', 3:'荒野', 4:'遺跡群', 5:'雪原', 6:'雪原', 7:'草原', 8:'砂漠', 9:'砂漠', 10:'遺跡群', 11:'火山', 12:'山岳地帯' },
  day4:   { 2:'侵食地帯', 3:'火山', 4:'遺跡群', 5:'砂漠', 6:'雪原', 7:'草原', 8:'荒野', 9:'遺跡群', 10:'火山', 11:'山岳地帯', 12:'山岳地帯' },
  day5_6: { 2:'侵食地帯', 3:'火山', 4:'遺跡群', 5:'砂漠', 6:'雪原', 7:'草原', 8:'荒野', 9:'遺跡群', 10:'火山', 11:'山岳地帯', 12:'侵食地帯' }
};

// クエストカード一覧 (1～48)
const QUEST_CARDS = [
  { id: 1, name: "すごいと言われたい", condition: "セッション中に1回スペシャルを発生させる", exp: 5, target: "知力15", judge: "最近読んだ本の感想を話す。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【優秀な】" },
  { id: 2, name: "まだ食べられる！", condition: "二日目以降、【ST】が最大値で【おいしい弁当】を使用", exp: 5, target: "意志8", judge: "大食いのテクニックを解説する。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【ムチムチな】" },
  { id: 3, name: "そんな人だったんだ……", condition: "昼の行動で交流を行い判定成功", exp: 5, target: "生命9", judge: "性的嗜好について語る。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【エッチな】" },
  { id: 4, name: "やられる……!?", condition: "魔王と遭遇したとき", exp: 10, target: "魅力10", judge: "世界を救う意気込みを魔王に聞かせる。", clear: "自分が死なずに戦闘終了", reward: "伝説P 10 / 特徴【ドMの】" },
  { id: 5, name: "誰も止められない", condition: "モンスター以外のNPCと戦闘を行う", exp: 5, target: "筋力8", judge: "汚い手で衛兵を倒す神々の描写。", clear: "戦闘に勝利する", reward: "伝説P 10 / 特徴【違法】" },
  { id: 6, name: "世界最弱を目指して", condition: "モンスターから逃亡する", exp: 5, target: "魅力8", judge: "自分の弱さのアピール。", clear: "戦闘に敗北する", reward: "伝説P 10 / 特徴【弱そうな】" },
  { id: 7, name: "好きです！ 女性版", condition: "女性PCに対して好意3を獲得", exp: 5, target: "素早10", judge: "告白のセリフを言う。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【女好きな】" },
  { id: 8, name: "好きです！ 男性版", condition: "男性PCに対して好意3を獲得", exp: 5, target: "敏捷10", judge: "告白のセリフを言う。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【男好きな】" },
  { id: 9, name: "ガチガチだ！", condition: "二日目に到達する", exp: 5, target: "生命11", judge: "奴も硬いが自分も硬いというアピール。", clear: "ST減少なしで戦闘終了", reward: "伝説P 10 / 特徴【やたら硬い】" },
  { id: 10, name: "ライバル登場", condition: "二日目に到達する", exp: 5, target: "意志7", judge: "獲物との因縁を話す。", clear: "戦闘に勝利する", reward: "伝説P 10 / 特徴【強そうな】" },
  { id: 11, name: "海の男", condition: "港・ギルド等の施設に遭遇", exp: 10, target: "知力12", judge: "過去を知る男を始末する様子。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【海賊】" },
  { id: 12, name: "宝の匂い", condition: "【豪華な宝箱】の解錠判定に成功", exp: 10, target: "敏捷12", judge: "宝の匂いがどんな匂いか説明する。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【冒険家】" },
  { id: 13, name: "最強の人間", condition: "六日目に到達する", exp: 10, target: "筋力11", judge: "世界最強を目指してきた道のりを話す。", clear: "戦闘に勝利する", reward: "伝説P 30 / 特徴【最強の】" },
  { id: 14, name: "イーリスのお願い", condition: "イーリスに好意1以上獲得", exp: 10, target: "知力10", judge: "一緒にどんな旅をしたいか語る。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【妖精】" },
  { id: 15, name: "仲間たちの歌", condition: "他PC全員に好意2以上獲得", exp: 10, target: "魅力12", judge: "詩的なことを言う。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【詩人】" },
  { id: 16, name: "勇者の目覚め", condition: "装備中のアイテム破壊時", exp: 10, target: "生命12", judge: "裸の快適さと勇気について語る。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【勇者】" },
  { id: 17, name: "いつかどこかで", condition: "最終日夜終了時にLv8以上", exp: 0, target: "自動", judge: "世界の果ての弓を引き抜く描写。", clear: "イベントが終了する", reward: "伝説P 10 / アイテム【世界の果ての弓】" },
  { id: 18, name: "素敵な衣装", condition: "魔王と遭遇したとき", exp: 5, target: "敏捷13", judge: "魔王の脱ぎ捨てたコートを観察。", clear: "イベント判定に成功", reward: "伝説P 10 / アイテム【魔王のコート】" },
  { id: 19, name: "個性的な旅", condition: "一日目に到達する", exp: 0, target: "自動", judge: "個性的あふれる旅路を語る。", clear: "エンディングに到達", reward: "伝説P 20" },
  { id: 20, name: "厳しい旅", condition: "魔王と遭遇したとき", exp: 5, target: "戦闘", judge: "【凶悪な魔王】との戦闘に挑む。", clear: "魔王を撃破する", reward: "伝説P 40" },
  { id: 21, name: "珍しい宝石", condition: "魔王と遭遇したとき", exp: 5, target: "戦闘", judge: "物持ちの魔王が持つ心臓を狙う。", clear: "魔王を撃破する", reward: "伝説P 10 / アイテム【魔王の心臓】" },
  { id: 22, name: "やさしい旅", condition: "城を出る際に公開", exp: 0, target: "自動", judge: "【癒しの鉢植え】を取り出す。", clear: "イベントが終了する", reward: "なし" },
  { id: 23, name: "変態狩り", condition: "二日目に到達する", exp: 5, target: "知力9", judge: "【変態の盗賊】の悪行を語る。", clear: "戦闘に勝利する", reward: "伝説P 20" },
  { id: 24, name: "探索の果て", condition: "二日目に到達する", exp: 5, target: "敏捷9", judge: "【幻のクマ】を追った冒険を語る。", clear: "戦闘に勝利する", reward: "伝説P 20" },
  { id: 25, name: "ネームド狩り", condition: "モンスターを3体倒す", exp: 5, target: "生命9", judge: "対抗して二つ名を名乗る。", clear: "戦闘に勝利する", reward: "伝説P 20" },
  { id: 26, name: "借金回収", condition: "施設を3つ訪れる", exp: 10, target: "魅力10", judge: "お金を返すように説得する。", clear: "イベント判定に成功", reward: "伝説P 20" },
  { id: 27, name: "どうしよう？", condition: "四日目に到達する", exp: 5, target: "敏捷", judge: "【古代種の雪ウサギ】を倒すか迷う。", clear: "イベントが終了する", reward: "伝説P 20" },
  { id: 28, name: "古代の地図", condition: "ダンジョンを3つ訪れる", exp: 5, target: "自動", judge: "古代の地図帖を開く。", clear: "イベントが終了する", reward: "伝説P 20" },
  { id: 29, name: "腕輪商人", condition: "2000シルバ入手", exp: 5, target: "魅力7", judge: "テンション高めにふるまう。", clear: "イベント判定に成功", reward: "伝説P 20" },
  { id: 30, name: "賞金稼ぎ", condition: "モンスターを3体倒す", exp: 5, target: "敏捷9", judge: "賞金の使い道を妄想する。", clear: "戦闘に勝利する", reward: "伝説P 30" },
  { id: 31, name: "闇の武具", condition: "施設を3つ訪れる", exp: 5, target: "知力10", judge: "【偉そうな老人】に敬意を払う。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 32, name: "不思議な思い出", condition: "任意PCに好意3獲得", exp: 5, target: "判定", judge: "思い出を語り合う。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 33, name: "薬師の記憶", condition: "【半獣人】PCに好意2獲得", exp: 5, target: "自動", judge: "記憶を辿る。", clear: "イベントが終了する", reward: "伝説P 10 / ネムリのしっぽ" },
  { id: 34, name: "牢獄の王女", condition: "四日目に到達する", exp: 10, target: "判定", judge: "王女を救出する覚悟。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 35, name: "覇王との出会い", condition: "魔王と遭遇したとき", exp: 5, target: "判定", judge: "覇王ヴィクターとの対峙。", clear: "イベント判定に成功", reward: "伝説P 10 / ヴィクターの王冠" },
  { id: 36, name: "王女の記憶", condition: "【アンデッド】で二日目到達", exp: 10, target: "判定", judge: "王女の過去を回想する。", clear: "イベント判定に成功", reward: "伝説P 30 / 手紙" },
  { id: 37, name: "覇王の記憶", condition: "二日目に到達する", exp: 5, target: "判定", judge: "覇王の記憶を追体験する。", clear: "イベント判定に成功", reward: "伝説P 20 / 次クエスト解放" },
  { id: 38, name: "魔王との会話", condition: "魔王にクスリを使用", exp: 5, target: "判定", judge: "魔王との心を通わせる言葉。", clear: "イベント判定に成功", reward: "伝説P 10 / 魔王の髪飾り" },
  { id: 39, name: "傭兵との出会い", condition: "1000シルバ獲得", exp: 5, target: "自動", judge: "傭兵と酒を交わす。", clear: "イベントが終了する", reward: "伝説P 10 / 次クエスト解放" },
  { id: 40, name: "魔王の記憶", condition: "聖武具を獲得", exp: 10, target: "判定", judge: "聖なる光に映る魔王の真実。", clear: "イベント判定に成功", reward: "伝説P 20 / 次クエスト解放" },
  { id: 41, name: "傭兵の記憶", condition: "2000シルバ獲得", exp: 10, target: "判定", judge: "傭兵の真の目的を聞く。", clear: "イベント判定に成功", reward: "伝説P 40" },
  { id: 42, name: "黒騎士との戦い", condition: "二日目に到達する", exp: 5, target: "戦闘", judge: "黒騎士の刃を受ける。", clear: "イベント時間経過", reward: "伝説P 10 / 次クエスト解放" },
  { id: 43, name: "耳長の村で", condition: "耳長の村を訪れる", exp: 5, target: "生命11", judge: "闇の勇者とは何かを語る。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 44, name: "黒騎士の記憶", condition: "任意PCに好意3獲得", exp: 5, target: "判定", judge: "黒騎士との絆を確かめる。", clear: "イベント判定に成功", reward: "伝説P 40" },
  { id: 45, name: "太古の言い伝え", condition: "【竜人の戦士】と遭遇", exp: 5, target: "戦闘", judge: "竜人の誇りに応える。", clear: "戦闘に勝利する", reward: "伝説P 10 / 次クエスト解放" },
  { id: 46, name: "闇の竜", condition: "聖武具を獲得", exp: 0, target: "戦闘", judge: "暗黒竜との最終決戦。", clear: "戦闘に勝利する", reward: "伝説P 100 / 栄誉" },
  { id: 47, name: "鱗の守護者", condition: "六日目に到達する", exp: 15, target: "戦闘", judge: "ゴーレムとの決闘。", clear: "戦闘に勝利する", reward: "伝説P 40 / 鱗の盾" },
  { id: 48, name: "牙の守護者", condition: "六日目に到達する", exp: 15, target: "戦闘", judge: "死雲の騎士を打ち倒す。", clear: "戦闘に勝利する", reward: "伝説P 40 / 牙の剣" }
];

// ランダムイベント表と各遭遇表
const rollDie = (sides = 6) => Math.floor(Math.random() * sides) + 1;
const rollTwoD6 = () => rollDie(6) + rollDie(6);

const FACILITY_TABLE = {
  2: ["聖なる神殿", "【意志】判定。成功すると【封印の扉】1枚が現れ、開ければ【聖なる武器の箱】が出現。失敗するとSTが1減少。"],
  3: ["魔王の力を封じた神殿", "【生命】判定。成功すると神殿に入り封印を解ける（魔王のLIFE+50、討伐時の伝説P+100。累積）。失敗すると入れない。望むなら守人と戦闘し、勝利すれば成功結果。"],
  4: ["耳長たちの村", "【生命】判定。成功すると耳長の商人から武器・耳長の細い剣を購入でき、売却も可能。失敗するとSTが2減少。"],
  5: ["大きな街", "「村遭遇表」を2回振り、好きな結果を選ぶ。"],
  6: ["小さな村", "「村遭遇表」を振る。"],
  7: ["地形による施設", "雪原なら「雪国の小屋」、山岳地帯なら「山小屋」、それ以外なら「村遭遇表」を振る。"],
  8: ["小さな村", "「村遭遇表」を振る。"],
  9: ["大きな街", "「村遭遇表」を2回振り、好きな結果を選ぶ。"],
  10: ["滅びた石の小屋", "【敏捷】判定。成功すると「かつての住人」1体と戦闘し、勝利すると木の箱1個。失敗すると2体と戦闘。"],
  11: ["滅びた小さな村", "【意志】判定。成功すると「かつての住人」2体と戦闘し、勝利すると木の箱1個。失敗すると4体と戦闘。"],
  12: ["闇ギルド", "【筋力】判定。成功すると闇ギルド商人から指定の希少アイテムを購入でき、売却も可能。失敗すると入れない。望むなら門番と戦闘できる。"]
};

const VILLAGE_TABLE = {
  2: ["壁と闇", "【敏捷】判定。成功すると抜け道を見つける。失敗すると石の小屋なら石の壁1枚、それ以外は木の壁1D6枚と戦闘。"],
  3: ["元気な男性", "【生命】判定。成功すると木の箱1個。失敗すると動物の肉1個。"],
  4: ["怯えた群衆", "【魅力】判定。成功するとアイテムを贈られ、ドロップアイテム表を使用。失敗するとSTが2減少。"],
  5: ["料理屋", "【生命】判定。成功するとおいしい弁当の購入とアイテム売却。失敗でも購入・売却できるが倍額。"],
  6: ["武器屋", "【筋力】判定。成功すると武器ドロップ表を使用でき、武器・矢の購入と売却。失敗でも購入・売却できるが倍額。"],
  7: ["道具屋", "【知力】判定。成功するとその他ドロップ表を使用でき、装飾品・消費アイテムの購入と売却。失敗でも購入・売却できるが倍額。"],
  8: ["防具屋", "【敏捷】判定。成功すると防具ドロップ表を使用でき、防具・盾の購入と売却。失敗でも購入・売却できるが倍額。"],
  9: ["占い師アウリス", "【意志】判定。成功すると制限を満たすフォースを1つ購入。失敗でも購入できるが倍額。"],
  10: ["女衛兵に目撃される", "【魅力】判定。成功すると正当性を立証し、ドロップアイテム表を使用。失敗すると女衛兵1体と戦闘。"],
  11: ["道に詳しい老婆", "【意志】判定。成功すると次の日の全エリアのイベントが公開。失敗するとSTが2減少。"],
  12: ["絶望した衛兵", "【筋力】判定。成功すると衛兵がとどまり、ドロップアイテム表を2回使用。失敗すると衛兵1体と戦闘。"]
};

const WORLD_TRAVEL_TABLE = [
  ["宝箱を発見", "【知力】判定。成功すると1D6で木の箱・鉄の宝箱・お金の宝箱のいずれか1個。失敗すると気のせいだった。", 2],
  ["実のなる木", "【敏捷】判定。成功するとナユタの実・スタミナ草・癒しの草を1つずつ獲得。失敗すると、望むなら実のなる木1体と戦闘。", 3],
  ["大荷物の商人", "【魅力】判定。成功するとあらゆる種類のアイテムを購入・売却。失敗すると購入・売却できるが倍額。", 2],
  ["野営中の兵士", "【意志】判定。成功すると木の箱1個。失敗すると、望むなら兵士1体と戦闘し、勝利すると木の箱1個。", 4],
  ["祭壇のゴーレム", "【筋力】判定。成功するとLIFEが物体5のゴーレム1体と戦闘。失敗すると通常のゴーレム1体と戦闘。", 3],
  ["旅の仲間との絆", "【生命】判定。成功すると任意のキャラクターへの好意+1。失敗すると任意のキャラクターへの好意-1（最低0）。", 3],
  ["盲長のあるおじ", "【生命】判定。成功すると「首長の村」イベントを好きなエリアに配置。失敗すると彼は消える。", 2],
  ["クールな女性", "【魅力】判定。成功すると翌日の同じ方角のイベントを知る。失敗すると彼女は南へ去る。", 2],
  ["トンネルで岩と闇", "【筋力】判定。成功すると脱出。失敗すると石の壁1D6枚と戦闘。", 4],
  ["船乗り風の男", "【生命】判定。成功すると「闇ギルド」イベントを好きなエリアに配置。失敗すると彼は北へ去る。", 2],
  ["徒歩の旅を考える", "【知力】判定。成功するとST+2。失敗するとST-2。", 2],
  ["ヴィクター王の城の兵士", "【意志】判定。成功するとヘヴィシールドを獲得。失敗すると彼は東へ旅を続ける。", 3],
  ["旅の料理人", "【知力】判定。成功すると500シルバでST全回復。失敗すると500シルバでSTを2回復。", 4],
  ["闇ギルドの客", "【魅力】判定。成功すると美しいカワウソの毛皮1つ。失敗すると闇ギルドの客1体と戦闘。", 2],
  ["親とはぐれた女の子", "【敏捷】判定。成功すると緑の森の矢を獲得。失敗すると女の子もいなくなる。", 4],
  ["女神像", "【魅力】判定。成功するとレベルを1減少させ、任意の能力値+1。失敗するとLIFE全回復。", 4],
  ["絶望した老人", "【意志】判定。成功すると「大きな街」を好きなエリアに配置。失敗すると老人を止められない。", 2],
  ["疲労の蓄積", "【生命】判定。成功するとST+4。失敗するとST-2。", 2],
  ["崖の上の光", "【筋力】判定。成功すると封印のカギを獲得。失敗するとLIFEを1D6減少。", 2],
  ["耳長の女", "【敏捷】判定。成功するとST全回復。失敗すると誰もいない。", 2],
  ["次元倉庫の番人", "【意志】判定。成功すると次元倉庫から好きなアイテムを取り出せる（入れることも可能）。失敗すると利用できない。", 3]
];

const DUNGEON_TABLE = {
  2: ["壁と闇に挟まれる", "【敏捷】判定。成功すると抜け道を見つける。失敗すると1D6を振り、1-2なら木の扉1枚、3-4なら鉄格子1枚、5-6なら石の壁1D6枚と戦闘。", 4],
  3: ["豪華な宝箱", "【意志】判定。成功すると注意深く魔物を回避。失敗するとガイコツ1D6体と戦闘し、勝利すると宝箱に挑める。", 2],
  4: ["お金の宝箱", "【知力】判定。成功すると注意深く魔物を回避。失敗するとコウモリ2D6体と戦闘し、勝利すると宝箱に挑める。", 2],
  5: ["ゾンビと遭遇", "【意志】判定。成功するとPCと同数のゾンビと戦闘。勝利するとドロップアイテム表を1回使用。失敗するとPC数+2体のゾンビと戦闘。", 1],
  6: ["ガイコツと遭遇", "【筋力】判定。成功するとPCと同数のガイコツと戦闘。勝利するとドロップアイテム表を1回使用。失敗するとPC数+2体のガイコツと戦闘。", 1],
  7: ["死霊の騎士", "【生命】判定。成功すると死霊の騎士1体と戦闘し、LIFEは物体9。失敗するとランダム特徴付きの死霊の騎士1体と戦闘。", 1],
  8: ["小鬼", "【敏捷】判定。成功すると小鬼1体と戦闘。失敗すると小鬼1D6体と戦闘。", 1],
  9: ["炎小鬼", "【筋力】判定。成功すると炎小鬼1体と戦闘。失敗すると炎小鬼3体に先制され、戦闘前に反撃ダメージを受ける。", 1],
  10: ["竜人の戦士", "【知力】判定。成功すると竜人の戦士1体と戦闘し、先制攻撃でLIFEが6になる。失敗するとランダム特徴付きの竜人の戦士1体と戦闘。", 2],
  11: ["鉄の宝箱", "【筋力】判定。成功すると宝箱のLIFEが物体10、開錠+2。失敗するとLIFEが物体18、開錠-2。", 2],
  12: ["女神像", "【魅力】判定。成功するとレベル-1、任意の能力値+1。失敗するとLIFE全回復。", 4]
};

const OUTDOOR_MONSTERS = {
  草原: ["コウモリ1D6体", "カラス1D6体", "野犬3体", "オオカミ2体", "トラ1体", "殺し屋ウルフ1体"],
  雪原: ["野犬1D6体", "野犬3体", "オオカミ1体", "オオカミ2体", "雪原クマ1体", "雪原クマ1体"],
  砂漠: ["鳥人1D6体", "鳥人2体", "砂漠オオカミ1体", "砂漠オオカミ2体", "キラーハウンド1体", "盗賊1体"],
  火山: ["鳥人1D6体", "炎小鬼2体", "盗賊1体", "クマ1体", "キラーハウンド1体", "ドラゴン1体"],
  荒野: ["コウモリ1D6体", "カラス1D6体", "野犬3体", "オオカミ2体", "ライオン1体", "盗賊1体"],
  山岳地帯: ["コウモリ1D6体", "カラス1D6体", "鳥人3体", "クマ1体", "トラ1体", "ドラゴン1体"],
  遺跡群: ["コウモリ1D6体", "カラス1D6体", "鳥人3体", "ゾンビ2体", "ガイコツ2体", "小鬼3体"],
  侵食地帯: ["牛頭の巨人1体", "死霊の騎士1体", "キラーハウンド1体", "殺し屋ウルフ1体", "ドラゴン1体", "ドラゴン1体"]
};

function makeEvent(category, title, detail, check = "表の指定に従う", rolls = "") {
  return { category, title, detail, check, judge: "参照表のジャッジに従って描写する。", rolls, isRevealed: false, revealedBy: null };
}

function generateOneEvent(day, terrain) {
  const mainRoll = rollDie(6);
  let category = "";
  let routeRoll = null;
  if (mainRoll === 1) {
    routeRoll = rollDie(6);
    category = routeRoll <= day ? "施設表" : "ダンジョン表";
  } else if (mainRoll === 2) {
    routeRoll = rollDie(6);
    category = routeRoll <= day ? "世界の旅表" : "野外遭遇表";
  } else {
    category = ({3:"施設表", 4:"世界の旅表", 5:"野外遭遇表", 6:"ダンジョン表"})[mainRoll];
  }
  const rolls = routeRoll ? `ランダムイベント表: ${mainRoll} / 追加1D6: ${routeRoll}（エリア日数${day}）` : `ランダムイベント表: ${mainRoll}`;
  if (category === "施設表") {
    const n = rollTwoD6();
    let [title, detail] = FACILITY_TABLE[n];
    if (n === 7) {
      if (terrain === "雪原") title = "雪国の小屋";
      else if (terrain === "山岳地帯") title = "山小屋";
      else title = "村遭遇表";
    }
    if (n === 5 || n === 9) {
      const a = rollTwoD6(), b = rollTwoD6();
      detail += ` 村遭遇表の出目は ${a}（${VILLAGE_TABLE[a][0]}）、${b}（${VILLAGE_TABLE[b][0]}）。好きな結果を選ぶ。`;
    } else if (n === 6 || n === 7 || n === 8) {
      const v = rollTwoD6();
      if (n === 7 && title !== "村遭遇表") {
        detail = title === "雪国の小屋"
          ? "【魅力】判定。成功するとSTを2回復し、消費アイテム：アンプルの購入と売却ができる。失敗すると入れてもらえず、LIFEを1D6減少。"
          : "【知力】判定。成功すると木の箱1個。失敗すると地形ごとの野外モンスター表を使用し、戦闘。";
      } else {
        detail += ` 出目${v}: ${VILLAGE_TABLE[v][0]}。${VILLAGE_TABLE[v][1]}`;
      }
    }
    return makeEvent(category, title, detail, "施設表の指定判定", rolls + ` / 施設表2D6: ${n}`);
  }
  if (category === "世界の旅表") {
    const d1 = rollDie(6), d2 = rollDie(6);
    const d66 = `${Math.min(d1, d2)}${Math.max(d1, d2)}`;
    const indexByD66 = {
      "11":0, "12":1, "13":2, "14":3, "15":4, "16":5,
      "22":6, "23":7, "24":8, "25":9, "26":10,
      "33":11, "34":12, "35":13, "36":14,
      "44":15, "45":16, "46":17, "55":18, "56":19, "66":20
    };
    const entry = WORLD_TRAVEL_TABLE[indexByD66[d66]];
    return makeEvent(category, entry[0], entry[1], "表の指定判定", rolls + ` / 世界の旅表D66: ${d66}`);
  }
  if (category === "野外遭遇表") {
    const n = rollDie(6);
    if (n <= 3) {
      const monsters = OUTDOOR_MONSTERS[terrain] || OUTDOOR_MONSTERS["草原"];
      const monster = monsters[rollDie(6)-1];
      return makeEvent(category, `野外モンスター遭遇：${monster}`, `地形「${terrain}」の野外モンスター表を使用。${n === 1 ? "出現したモンスター1体にランダムな特徴を付ける（モンスター特徴表）。" : ""}`, "戦闘", rolls + ` / 野外遭遇表: ${n} / 地形表: 1D6`);
    }
    if (n === 4) return makeEvent(category, "アンデッドの群れ", "死霊の騎士1体と、エリアのPCと同数のガイコツが出現し戦闘。", "戦闘", rolls + " / 野外遭遇表: 4");
    if (n === 5) return makeEvent(category, "盗賊の群れ", "エリアのPCと同数の盗賊が出現し戦闘。そのうち1体にランダムな特徴を付ける。", "戦闘", rolls + " / 野外遭遇表: 5");
    return makeEvent(category, "希少動物表", "地形に応じた希少動物が1体出現する。戦闘を挑んでも、見送ってもよい。", "遭遇", rolls + " / 野外遭遇表: 6");
  }
  if (category === "ダンジョン表") {
    let n = rollDie(6);
    if (day >= 4) n += 1;
    if (n <= 2) return makeEvent(category, "犬小屋", "犬小屋イベント。知力判定。成功すると野犬1D6体と戦闘し勝利で鉄の箱。失敗すると野犬1D6体とオオカミ1D6体と戦闘し勝利で木の箱。", "知力", rolls + ` / ダンジョン表: ${n}（日数補正込み）`);
    if (n === 7) return makeEvent(category, "牢獄つきダンジョン", "牢獄遭遇表（2D6）を使用する。", "牢獄遭遇表", rolls + " / ダンジョン表: 7");
    const size = n === 3 || n === 4 ? "小型" : n === 5 ? "中型" : "大型";
    const bonus = n === 5 ? "モンスター数+1、イベント経験値+1。" : n === 6 ? "モンスター数+2、イベント経験値+2。" : "";
    const d = rollTwoD6();
    const [title, detail, exp] = DUNGEON_TABLE[d];
    return makeEvent(category, `${size}ダンジョン：${title}`, `${detail} ${bonus}`, "ダンジョン遭遇表の指定判定", rolls + ` / ダンジョン表: ${n} / ダンジョン遭遇表2D6: ${d}`);
  }
  return makeEvent(category, category, "結果を確認してください。", "", rolls);
}

function generateDayEvents(day, terrain) {
  const positions = ['north', 'center', 'south'];
  const dayEvents = {};
  positions.forEach((pos) => {
    dayEvents[pos] = generateOneEvent(day, terrain);
  });
  return dayEvents;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalDays, setTotalDays] = useState(4);

  const [roomData, setRoomData] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState('board');
  const [copyNotification, setCopyNotification] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 公開ルーム一覧をリアルタイム購読
  useEffect(() => {
    if (!user) return;
    const roomsRef = collection(db, 'artifacts', appId, 'public', 'data', 'rooms');
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const rooms = snapshot.docs.map((item) => ({ ...item.data(), roomId: item.id }))
        .filter((room) => room.phase === 'lobby' || room.phase === 'playing')
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setAvailableRooms(rooms);
      setSelectedRoomId((current) => current && rooms.some((room) => room.roomId === current) ? current : '');
    }, (error) => console.error('Room list sync error:', error));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !joinedRoom || !roomId) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
        setSelectedQuestId(data.players?.[user.uid]?.questId ?? null);
      } else {
        // ホストが部屋を削除した場合、参加者側もロビーへ戻す
        setJoinedRoom(false);
        setRoomData(null);
        setRoomId('');
        setSelectedRoomId('');
        setActiveTab('board');
      }
    }, (error) => {
      console.error("Room sync error:", error);
    });

    return () => unsubscribe();
  }, [user, joinedRoom, roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.logs]);

  const showCopyToast = (text) => {
    navigator.clipboard.writeText(text);
    setCopyNotification("クリップボードにコピーしました！");
    setTimeout(() => setCopyNotification(''), 2000);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return alert("プレイヤー名を入力してください");
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const initialTerrains = {};
    const initialEvents = {};
    const daysNum = Number(totalDays);

    for (let d = 1; d <= daysNum; d++) {
      let tableKey = 'day1_2';
      if (d === 3) tableKey = 'day3';
      else if (d === 4) tableKey = 'day4';
      else if (d >= 5) tableKey = 'day5_6';

      const diceRes = rollDice(2);
      initialTerrains[d] = TERRAIN_TABLES[tableKey][diceRes.sum];
      initialEvents[d] = generateDayEvents(d, initialTerrains[d]);
    }

    const resolvedRoomName = roomName.trim() || `冒険の部屋 ${newRoomId}`;
    const newRoomState = {
      roomId: newRoomId,
      roomName: resolvedRoomName,
      hostId: user.uid,
      maxPlayers: Number(maxPlayers),
      totalDays: daysNum,
      currentDay: 1,
      phase: 'lobby',
      terrains: initialTerrains,
      events: initialEvents,
      players: {
        [user.uid]: {
          uid: user.uid,
          name: playerName,
          questId: null,
          questPublic: false,
          isReady: false
        }
      },
      logs: [
        { id: Date.now(), sender: 'システム', text: `ルーム「${resolvedRoomName}」[${newRoomId}] が作成されました。`, time: new Date().toLocaleTimeString() }
      ]
    };

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', newRoomId);
    await setDoc(roomRef, newRoomState);
    setRoomId(newRoomId);
    setJoinedRoom(true);
  };

  const handleLeaveRoom = async () => {
    if (!roomId || !user || !roomData) return;
    if (!window.confirm('この冒険の部屋から退室しますか？')) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    try {
      const latestSnap = await getDoc(roomRef);
      if (latestSnap.exists()) {
        const latest = latestSnap.data();
        const players = { ...(latest.players || {}) };
        delete players[user.uid];
        const remainingIds = Object.keys(players);

        if (remainingIds.length === 0) {
          await deleteDoc(roomRef);
        } else {
          const nextHostId = latest.hostId === user.uid ? remainingIds[0] : latest.hostId;
          const leavingName = latest.players?.[user.uid]?.name || playerName || 'プレイヤー';
          const logs = [...(latest.logs || []), {
            id: Date.now(), sender: 'システム',
            text: `${leavingName} さんが退室しました。${latest.hostId === user.uid ? ` ${players[nextHostId]?.name || '別の参加者'} さんがホストを引き継ぎました。` : ''}`,
            time: new Date().toLocaleTimeString()
          }];
          await updateDoc(roomRef, { players, hostId: nextHostId, logs, updatedAt: Date.now() });
        }
      }
      setJoinedRoom(false);
      setRoomData(null);
      setRoomId('');
      setSelectedRoomId('');
      setActiveTab('board');
    } catch (error) {
      console.error('Leave room error:', error);
      alert('退室に失敗しました。通信状態やFirestoreの権限を確認してください。');
    }
  };

  const handleDeleteRoom = async (targetRoomId = roomId) => {
    if (!targetRoomId || !user) return;
    const targetRoom = targetRoomId === roomId ? roomData : availableRooms.find((room) => room.roomId === targetRoomId);
    if (!targetRoom || targetRoom.hostId !== user.uid) {
      alert('部屋を削除できるのはホストのみです。');
      return;
    }
    if (!window.confirm(`部屋「${targetRoom.roomName || `冒険の部屋 ${targetRoomId}`}」を削除しますか？\n参加者全員が利用できなくなります。この操作は取り消せません。`)) return;

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', targetRoomId));
      if (targetRoomId === roomId) {
        setJoinedRoom(false);
        setRoomData(null);
        setRoomId('');
        setSelectedRoomId('');
        setActiveTab('board');
      }
    } catch (error) {
      console.error('Delete room error:', error);
      alert(`部屋の削除に失敗しました。\nエラーコード: ${error.code || '不明'}\n詳細: ${error.message || '詳細情報はありません'}\nFirestoreのセキュリティルールとホスト権限を確認してください。`);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) return alert("プレイヤー名を入力してください");
    if (!selectedRoomId) return alert("参加する部屋を一覧から選択してください");
    const targetRoomId = selectedRoomId;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', targetRoomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
      return alert("指定されたルームが見つかりません");
    }

    const data = docSnap.data();
    if (Object.keys(data.players || {}).length >= data.maxPlayers) {
      return alert("ルーム満員です");
    }

    const updatedPlayers = {
      ...data.players,
      [user.uid]: {
        uid: user.uid,
        name: playerName,
        questId: null,
        questPublic: false,
        isReady: false
      }
    };

    const newLogs = [
      ...(data.logs || []),
      { id: Date.now(), sender: 'システム', text: `${playerName} さんが参加しました。`, time: new Date().toLocaleTimeString() }
    ];

    await updateDoc(roomRef, { players: updatedPlayers, logs: newLogs });
    setRoomId(targetRoomId);
    setJoinedRoom(true);
  };

  function rollDice(count = 1, sides = 6) {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { rolls, sum };
  }

  const handleSelectQuest = async (questId) => {
    if (!roomData) return;

    const takenByOther = Object.entries(roomData.players || {}).some(
      ([pUid, pData]) => pUid !== user.uid && pData.questId === questId
    );

    if (takenByOther) {
      return alert("このクエストカードは既に他のプレイヤーに選択されています。");
    }

    setSelectedQuestId(questId);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    
    await updateDoc(roomRef, {
      [`players.${user.uid}.questId`]: questId,
      [`players.${user.uid}.questPublic`]: false
    });
  };

  const handleToggleQuestPublic = async () => {
    if (!roomData || !user || !selectedQuestId) {
      return alert("先にクエストを選択してください。");
    }
    const nextPublic = !Boolean(roomData.players?.[user.uid]?.questPublic);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await updateDoc(roomRef, {
      [`players.${user.uid}.questPublic`]: nextPublic
    });
  };

  const handleRevealEvent = async (day, position) => {
    if (!roomData || !user) return;
    const targetDayEvents = roomData.events?.[day];
    const targetEvent = targetDayEvents?.[position];
    if (!targetEvent || targetEvent.isRevealed) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const player = roomData.players?.[user.uid];
    const playerName = player?.name || 'プレイヤー';
    const updatedEvents = {
      ...roomData.events,
      [day]: {
        ...targetDayEvents,
        [position]: { ...targetEvent, isRevealed: true, revealedBy: playerName }
      }
    };

    const posLabel = position === 'north' ? '北' : position === 'center' ? '中央' : '南';
    const newLog = {
      id: Date.now(),
      sender: '探索',
      text: `${playerName} が【${day}日目・${posLabel}エリア】のイベント『${targetEvent.category}：${targetEvent.title}』を公開しました！`,
      time: new Date().toLocaleTimeString()
    };

    await updateDoc(roomRef, {
      events: updatedEvents,
      logs: [...(roomData.logs || []), newLog],
      updatedAt: Date.now()
    });
  };

  const handleHideEvent = async (day, position) => {
    if (!roomData || !user) return;
    const targetDayEvents = roomData.events?.[day];
    const targetEvent = targetDayEvents?.[position];
    if (!targetEvent || !targetEvent.isRevealed) return;

    const posLabel = position === 'north' ? '北' : position === 'center' ? '中央' : '南';
    if (!window.confirm(`【${day}日目・${posLabel}エリア】のイベントを非公開に戻しますか？`)) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const player = roomData.players?.[user.uid];
    const playerName = player?.name || 'プレイヤー';
    const updatedEvents = {
      ...roomData.events,
      [day]: {
        ...targetDayEvents,
        [position]: { ...targetEvent, isRevealed: false, revealedBy: null }
      }
    };
    const newLog = {
      id: Date.now(),
      sender: '探索',
      text: `${playerName} が【${day}日目・${posLabel}エリア】のイベント『${targetEvent.category}：${targetEvent.title}』を非公開に戻しました。`,
      time: new Date().toLocaleTimeString()
    };

    await updateDoc(roomRef, {
      events: updatedEvents,
      logs: [...(roomData.logs || []), newLog],
      updatedAt: Date.now()
    });
  };

  const handleRerollEvent = async (day, position) => {
    if (!roomData || !user) return;
    const targetDayEvents = roomData.events?.[day];
    const targetEvent = targetDayEvents?.[position];
    if (!targetEvent) return;

    const posLabel = position === 'north' ? '北' : position === 'center' ? '中央' : '南';
    if (!window.confirm(`【${day}日目・${posLabel}エリア】のイベントを再決定しますか？\n現在のイベント内容は新しい結果に置き換わります。`)) return;

    const terrain = roomData.terrains?.[day] || '草原';
    const newEvent = generateOneEvent(Number(day), terrain);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const player = roomData.players?.[user.uid];
    const playerName = player?.name || 'プレイヤー';
    const updatedEvents = {
      ...roomData.events,
      [day]: { ...targetDayEvents, [position]: newEvent }
    };
    const newLog = {
      id: Date.now(),
      sender: '探索',
      text: `${playerName} が【${day}日目・${posLabel}エリア】のイベントを再決定しました（${targetEvent.title} → ${newEvent.title}）。`,
      time: new Date().toLocaleTimeString()
    };

    await updateDoc(roomRef, {
      events: updatedEvents,
      logs: [...(roomData.logs || []), newLog],
      updatedAt: Date.now()
    });
  };

  const handleAdvanceDay = async () => {
    if (user.uid !== roomData.hostId) return;
    const nextDay = roomData.currentDay + 1;
    if (nextDay > roomData.totalDays) {
      alert("最終日に到達しています！");
      return;
    }

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const newLog = {
      id: Date.now(),
      sender: 'システム',
      text: `【${nextDay}日目】へ進行しました。`,
      time: new Date().toLocaleTimeString()
    };

    await updateDoc(roomRef, {
      currentDay: nextDay,
      logs: [...(roomData.logs || []), newLog]
    });
  };

  const handleRollSharedDice = async (count, label = "ダイス判定") => {
    const res = rollDice(count);
    const player = roomData?.players?.[user.uid];
    const logText = `${player ? player.name : '誰か'}が ${label} で ${count}D6 を振りました ➔ [ ${res.rolls.join(', ')} ] 合計: ${res.sum}`;

    if (roomData && roomId) {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
      await updateDoc(roomRef, {
        logs: [...(roomData.logs || []), { id: Date.now(), sender: 'ダイス', text: logText, time: new Date().toLocaleTimeString() }]
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !roomData) return;
    const player = roomData.players[user.uid];
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await updateDoc(roomRef, {
      logs: [...(roomData.logs || []), {
        id: Date.now(),
        sender: player.name,
        text: chatMessage,
        time: new Date().toLocaleTimeString()
      }]
    });
    setChatMessage('');
  };

  if (!joinedRoom || !roomData) {
    return (
      <div className="min-h-screen text-stone-800 p-4 md:p-8" style={{background:'linear-gradient(135deg,#e8e2ce 0%,#f7f3e8 48%,#d8dfc9 100%)'}}>
        <div className="max-w-5xl mx-auto">
          <header className="text-center py-8 md:py-12">
            <div className="inline-flex items-center justify-center rounded-full border-2 border-emerald-900/30 bg-emerald-950 text-amber-100 w-16 h-16 mb-4 shadow-lg">
              <Sword className="w-8 h-8" />
            </div>
            <p className="text-xs tracking-[0.35em] uppercase text-emerald-900/70 mb-2">One Way Heroes · Online Table</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-wide text-emerald-950">片道勇者 TRPG</h1>
            <p className="mt-4 text-sm md:text-base text-stone-600">イベント・地形ランダム決定ツール</p>
          </header>

          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-5 items-start">
            <section className="bg-white/80 backdrop-blur rounded-2xl border border-emerald-950/15 p-5 md:p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-amber-700" />
                <h2 className="text-xl font-bold text-emerald-950">冒険の準備</h2>
              </div>
              <label className="block text-sm font-bold text-stone-600 mb-2">プレイヤー名</label>
              <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
                placeholder="例：勇者オルフェ" maxLength={30}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-stone-800 outline-none focus:ring-2 focus:ring-emerald-700 mb-4" />
              <label className="block text-sm font-bold text-stone-600 mb-2">ルーム名</label>
              <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
                placeholder="例：はじめての片道勇者／金曜夜の冒険" maxLength={40}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-stone-800 outline-none focus:ring-2 focus:ring-emerald-700 mb-2" />
              <p className="text-xs text-stone-500 mb-5">未入力の場合は、自動で「冒険の部屋 ＋部屋コード」という名前になります。</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">最大人数</label>
                  <select value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} 人</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">冒険日数</label>
                  <select value={totalDays} onChange={(e) => setTotalDays(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5">
                    {[2,4,6].map(d => <option key={d} value={d}>{d} 日間</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCreateRoom} className="w-full flex items-center justify-center gap-2 bg-emerald-900 hover:bg-emerald-800 text-amber-50 font-bold py-3 px-4 rounded-xl shadow-md transition">
                <Play className="w-4 h-4" /> 新しい冒険を始める
              </button>
              <p className="text-xs text-stone-500 mt-3 leading-relaxed">部屋を作成すると、一覧に表示されます。参加者は一覧から部屋を選んで入室できます。</p>
            </section>

            <section className="bg-white/80 backdrop-blur rounded-2xl border border-emerald-950/15 p-5 md:p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-emerald-950">公開中の冒険</h2>
                  <p className="text-xs text-stone-500 mt-1">参加したい部屋を選択してください</p>
                </div>
                <span className="text-xs rounded-full bg-emerald-100 text-emerald-900 px-3 py-1">{availableRooms.length} 部屋</span>
              </div>
              {availableRooms.length === 0 ? (
                <div className="text-center rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8">
                  <Compass className="w-8 h-8 mx-auto text-stone-400 mb-3" />
                  <p className="font-bold text-stone-600">現在、参加できる部屋はありません</p>
                  <p className="text-xs text-stone-500 mt-2">新しい部屋を作成すると、ここに表示されます。</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
                  {availableRooms.map((room) => {
                    const count = Object.keys(room.players || {}).length;
                    const full = count >= Number(room.maxPlayers || 4);
                    const selected = selectedRoomId === room.roomId;
                    return <div key={room.roomId} className={`rounded-xl transition ${selected ? 'bg-emerald-100/70 ring-2 ring-amber-500 ring-offset-2 ring-offset-white shadow-lg' : ''}`}>
                      <button type="button" disabled={full} onClick={() => setSelectedRoomId(room.roomId)}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-xl border-2 p-4 transition ${selected ? 'border-emerald-900 bg-emerald-50' : 'border-stone-200 bg-white hover:border-emerald-700'} ${full ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-300 bg-white text-transparent'}`}>
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="font-bold text-emerald-950">{room.roomName || `冒険の部屋 ${room.roomId}`}</div>
                              <div className="text-xs text-stone-500 mt-1">部屋コード：{room.roomId}</div>
                            </div>
                          </div>
                          <span className={`shrink-0 text-xs font-bold rounded-full px-2.5 py-1 ${full ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-900'}`}>{full ? '満員' : '参加可能'}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 mt-3 pl-9">
                          <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {count}/{room.maxPlayers || 4} 人</span>
                          <span>{room.totalDays || 4} 日間の冒険</span>
                          <span>{room.phase === 'playing' ? '冒険中' : '参加者募集中'}</span>
                        </div>
                        {selected && <div className="mt-3 ml-9 inline-flex items-center gap-1 rounded-full bg-emerald-900 px-3 py-1 text-xs font-extrabold text-amber-100"><CheckCircle2 className="w-3.5 h-3.5" /> 入室対象に選択中</div>}
                      </button>
                      {room.hostId === user?.uid && <button type="button" onClick={() => handleDeleteRoom(room.roomId)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"><Trash2 className="w-3.5 h-3.5" /> この部屋を削除</button>}
                    </div>;
                  })}
                </div>
              )}
              <button onClick={handleJoinRoom} disabled={!selectedRoomId || (() => { const selected = availableRooms.find((r) => r.roomId === selectedRoomId); return !selected || Object.keys(selected.players || {}).length >= Number(selected.maxPlayers || 4); })()} className="w-full mt-4 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-300 disabled:text-stone-500 text-white font-bold py-3 rounded-xl transition">
                {selectedRoomId ? '✓ 選択した部屋に参加する' : 'まず参加する部屋を選択してください'}
              </button>
            </section>
          </div>
          <p className="text-center text-xs text-stone-500 mt-8">※削除できるのは自分が立てた部屋のみ</p>
        </div>
      </div>
    );
  }

  const myData = roomData.players?.[user.uid] || {};
  const totalDaysCount = roomData.totalDays || 4;
  const daysArray = Array.from({ length: totalDaysCount }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-serif flex flex-col relative">
      
      {/* コピー完了トースト通知 */}
      {copyNotification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-800 border border-emerald-400 text-emerald-100 px-4 py-2 rounded-lg shadow-2xl text-xs font-bold animate-bounce">
          {copyNotification}
        </div>
      )}

      {/* ヘッダーバー */}
      <header className="bg-stone-900 border-b border-stone-800 p-3 px-4 flex flex-wrap items-center justify-between gap-2 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-amber-400 flex items-center gap-1.5">
            <Sword className="w-5 h-5 text-amber-500" />
            片道勇者TRPG
          </h1>
          <span className="bg-stone-800 border border-stone-700 px-3 py-1 rounded text-xs font-mono text-amber-300" title={`ルームID: ${roomData.roomId}`}>
            {roomData.roomName || `冒険の部屋 ${roomData.roomId}`} ({roomData.roomId})
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 font-bold">【 現在: {roomData.currentDay}日目 / 全{totalDaysCount}日 】</span>
          </div>

          {user.uid === roomData.hostId && roomData.currentDay < totalDaysCount && (
            <button
              onClick={handleAdvanceDay}
              className="bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold px-3 py-1 rounded flex items-center gap-1 border border-amber-500 shadow transition"
            >
              次の日へ進む <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {user.uid === roomData.hostId && (
            <button onClick={() => handleDeleteRoom(roomId)} className="bg-rose-950 hover:bg-rose-900 text-rose-100 font-bold px-3 py-1 rounded flex items-center gap-1 border border-rose-700 shadow transition">
              <Trash2 className="w-4 h-4" /> 部屋を削除
            </button>
          )}
          <button onClick={handleLeaveRoom} className="bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold px-3 py-1 rounded flex items-center gap-1 border border-stone-600 shadow transition">
            <LogOut className="w-4 h-4" /> 退室
          </button>
        </div>
      </header>

      {/* タブ切替 */}
      <div className="bg-stone-900/80 border-b border-stone-800 px-4 flex gap-2 text-sm shrink-0">
        <button
          onClick={() => setActiveTab('board')}
          className={`py-2 px-4 border-b-2 font-bold flex items-center gap-1.5 transition ${
            activeTab === 'board' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <MapPin className="w-4 h-4" /> 冒険マップシート
        </button>
        <button
          onClick={() => setActiveTab('character')}
          className={`py-2 px-4 border-b-2 font-bold flex items-center gap-1.5 transition ${
            activeTab === 'character' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Award className="w-4 h-4" /> クエスト選択
        </button>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        
        <main className="flex-none p-4 overflow-visible space-y-6">

          {activeTab === 'board' && (
            <div className="w-full mx-auto space-y-4">
              <div className="text-center font-bold tracking-widest text-stone-400 bg-stone-900 py-2 rounded-lg text-xs uppercase border border-stone-800 shadow">
                冒険マップシート (1日目から順に横並び / 公開済みイベントクリックでコピー)
              </div>

              <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '12px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '16px', width: 'max-content', minWidth: '100%' }}>
                {daysArray.map(day => {
                  const terrainName = roomData.terrains?.[day] || '草原';
                  const terrainObj = TERRAIN_DATA[terrainName] || TERRAIN_DATA['草原'];
                  const dayEvents = roomData.events?.[day] || {};
                  const isCurrentDay = roomData.currentDay === day;

                  return (
                    <div 
                      key={day} 
                      className={`bg-stone-900 rounded-xl p-3.5 flex flex-col gap-3 shadow-xl transition ${
                        isCurrentDay ? 'bg-stone-900/95' : 'opacity-100'
                      }`}
                      style={{ flex: '0 0 280px', width: '280px', minWidth: '280px', boxSizing: 'border-box', border: isCurrentDay ? '3px solid #fbbf24' : '2px solid #78716c', boxShadow: isCurrentDay ? '0 0 0 2px rgba(245,158,11,0.22), 0 12px 24px rgba(0,0,0,0.35)' : '0 8px 20px rgba(0,0,0,0.3)' }}
                    >
                      <div className={`text-center font-bold text-xs py-1.5 rounded-lg border shadow-inner ${
                        isCurrentDay ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-stone-950 text-stone-400 border-stone-800'
                      }`}>
                        {day}日目 {isCurrentDay && '★現在'}
                      </div>

                      <div className="bg-stone-950 border border-stone-700 rounded-lg p-2.5 text-center shadow-inner">
                        <span className="text-[10px] text-stone-400 block uppercase font-semibold mb-0.5">地形</span>
                        <div className="font-bold text-sm text-amber-200 flex items-center justify-center gap-1.5">
                          <span>{terrainObj.icon}</span> {terrainName}
                        </div>
                      </div>

                      <div className="bg-stone-950 border border-stone-700 rounded-lg p-2.5 text-xs text-stone-300 min-h-[55px] flex items-center shadow-inner">
                        <div>
                          <span className="text-amber-400 font-bold block mb-0.5">【地形効果】</span>
                          <span className="text-[11px] leading-tight">{terrainObj.effect}</span>
                        </div>
                      </div>

                      {['north', 'center', 'south'].map(pos => {
                        const ev = dayEvents[pos];
                        const posCode = pos === 'north' ? 'N (北)' : pos === 'center' ? 'M (中央)' : 'S (南)';

                        return (
                          <div 
                            key={pos} 
                            onClick={() => {
                              if (ev?.isRevealed) {
                                const copyText = `【${day}日目・${posCode}】${ev.category}: ${ev.title}\n判定: ${ev.check}\n詳細: ${ev.detail || ''}\nロール: ${ev.rolls || ''}`;
                                showCopyToast(copyText);
                              }
                            }}
                            className={`bg-gradient-to-br from-stone-950 to-stone-900 rounded-xl p-3 flex flex-col justify-between text-xs relative min-h-[145px] shadow-md ${ev?.isRevealed ? 'cursor-pointer hover:border-amber-400 transition' : ''}`} 
                            style={{ border: '2px solid #b45309', boxShadow: '0 3px 10px rgba(0,0,0,0.3)' }}
                          >
                            <div>
                              <div className="flex justify-between items-center border-b border-stone-800 pb-1 mb-1.5">
                                <span className="font-bold text-[10px] text-amber-400 uppercase tracking-wider">イベントカード {ev?.isRevealed && '(クリックでコピー)'}</span>
                                <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                                  {posCode}
                                </span>
                              </div>

                              {ev ? (
                                ev.isRevealed ? (
                                  <div className="space-y-1.5">
                                    <div className="text-[9px] text-amber-400 font-bold tracking-wide">{ev.category}</div>
                                    <div className="font-bold text-stone-100 text-xs">{ev.title}</div>
                                    <div className="text-[10px] text-stone-300 bg-stone-900 p-1.5 rounded border border-stone-800">
                                      <span className="text-amber-400 font-bold">判定:</span> {ev.check}
                                    </div>
                                    {ev.detail && (
                                      <div className="text-[10px] leading-relaxed text-stone-200 whitespace-normal break-words">
                                        {ev.detail}
                                      </div>
                                    )}
                                    {ev.rolls && (
                                      <div className="text-[9px] text-stone-500 border-t border-stone-800 pt-1">
                                        {ev.rolls}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-3 space-y-1.5">
                                    <span className="text-[10px] text-stone-500 block">（未公開カード）</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevealEvent(day, pos);
                                      }}
                                      className="bg-amber-800 hover:bg-amber-700 text-amber-100 text-xs font-bold px-3 py-1.5 rounded border border-amber-600 shadow transition w-full"
                                    >
                                      イベントを公開する
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRerollEvent(day, pos);
                                      }}
                                      className="bg-sky-900 hover:bg-sky-800 text-sky-100 text-xs font-bold px-3 py-1.5 rounded border border-sky-700 shadow transition w-full"
                                    >
                                      <RefreshCw className="w-3 h-3 inline mr-1" />イベントを再決定
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-[10px] text-stone-600">未配置</span>
                              )}
                            </div>

                            {ev?.isRevealed && (
                              <div className="mt-2 space-y-1.5">
                                <div className="text-[10px] text-emerald-400 text-right font-sans font-semibold">
                                  ✓ {ev.revealedBy} 公開
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHideEvent(day, pos);
                                    }}
                                    className="bg-stone-700 hover:bg-stone-600 text-stone-100 text-[10px] font-bold px-2 py-1.5 rounded border border-stone-500 transition"
                                  >
                                    <EyeOff className="w-3 h-3 inline mr-1" />非公開に戻す
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRerollEvent(day, pos);
                                    }}
                                    className="bg-sky-900 hover:bg-sky-800 text-sky-100 text-[10px] font-bold px-2 py-1.5 rounded border border-sky-700 transition"
                                  >
                                    <RefreshCw className="w-3 h-3 inline mr-1" />再決定
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'character' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="bg-stone-900 border-2 border-stone-600 rounded-xl p-4 shadow-lg space-y-2">
                <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" /> プレイヤー情報
                </h2>
                <div className="text-base font-bold text-stone-200 bg-stone-950 p-3 rounded border border-stone-800 inline-block">
                  名前: <span className="text-amber-300">{myData.name}</span>
                </div>
              </div>

              {/* クエスト選択 */}
              <div className="bg-stone-900 border-2 border-stone-600 rounded-xl p-4 shadow-lg space-y-4">
                <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <Award className="w-5 h-5" /> クエスト選択 (1～48)
                </h2>
                <p className="text-xs text-stone-400">
                  クエスト名から選択できます。選択したクエストは、公開ボタンを押すまで他のプレイヤーには内容が表示されません。同じクエストは複数人で選択できません。
                </p>

                <div className="space-y-2">
                  <label htmlFor="quest-select" className="block text-sm font-bold text-stone-200">選択するクエスト</label>
                  <select
                    id="quest-select"
                    value={selectedQuestId ?? ''}
                    onChange={(e) => handleSelectQuest(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-stone-950 border-2 border-stone-500 rounded-lg p-3 text-stone-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">クエストを選択してください</option>
                    {QUEST_CARDS.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.id}. {q.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleQuestPublic}
                      disabled={!selectedQuestId}
                      className={`rounded-lg border-2 px-4 py-2 font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${myData.questPublic ? 'bg-stone-800 border-stone-500 text-stone-200 hover:bg-stone-700' : 'bg-amber-700 border-amber-400 text-amber-50 hover:bg-amber-600'}`}
                    >
                      {myData.questPublic ? 'クエストを非公開に戻す' : '選択中のクエストを公開'}
                    </button>
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${myData.questPublic ? 'text-emerald-300 border-emerald-700 bg-emerald-950/50' : 'text-stone-400 border-stone-700 bg-stone-950'}`}>
                      {myData.questPublic ? '公開中：全プレイヤーに表示' : '非公開：自分だけに表示'}
                    </span>
                  </div>
                </div>

                {(() => {
                  const selectedQuest = QUEST_CARDS.find(q => q.id === selectedQuestId);
                  if (!selectedQuest) {
                    return <div className="rounded-lg border-2 border-dashed border-stone-700 p-6 text-center text-sm text-stone-500">クエストを選択すると、ここに詳細が表示されます。</div>;
                  }
                  return (
                    <div className="rounded-xl bg-gradient-to-br from-stone-950 via-stone-950 to-stone-900 p-5 space-y-4 shadow-lg shadow-amber-950/30 ring-1 ring-amber-300/20" style={{ border: "4px solid #f59e0b", boxSizing: "border-box", display: "inline-block", width: "fit-content", maxWidth: "100%" }}>
                      <div className="flex items-start justify-between gap-3 border-b border-stone-700 pb-3">
                        <div>
                          <p className="text-xs text-stone-500">クエストカード #{selectedQuest.id}</p>
                          <h3 className="text-xl font-bold text-amber-300">{selectedQuest.name}</h3>
                        </div>
                        <span className="shrink-0 rounded border border-stone-600 px-2 py-1 text-xs text-amber-300">経験点 {selectedQuest.exp}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-stone-900 p-3" style={{ border: "2px solid #78716c", boxSizing: "border-box" }}>
                          <h4 className="text-xs font-bold text-amber-400 mb-1">公開条件</h4>
                          <p className="text-sm text-stone-200">{selectedQuest.condition}</p>
                        </div>
                        <div className="rounded-lg bg-stone-900 p-3" style={{ border: "2px solid #78716c", boxSizing: "border-box" }}>
                          <h4 className="text-xs font-bold text-amber-400 mb-1">目標・イベント</h4>
                          <p className="text-sm text-stone-200"><strong>[目標 {selectedQuest.target}]</strong> {selectedQuest.judge}</p>
                        </div>
                        <div className="rounded-lg bg-stone-900 p-3" style={{ border: "2px solid #78716c", boxSizing: "border-box" }}>
                          <h4 className="text-xs font-bold text-amber-400 mb-1">クリア条件</h4>
                          <p className="text-sm text-stone-200">{selectedQuest.clear}</p>
                        </div>
                        <div className="rounded-lg bg-stone-900 p-3" style={{ border: "2px solid #78716c", boxSizing: "border-box" }}>
                          <h4 className="text-xs font-bold text-amber-400 mb-1">報酬</h4>
                          <p className="text-sm font-bold text-amber-300">{selectedQuest.reward}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 公開済みクエスト（クリックでコピー機能付き） */}
              <div className="bg-stone-900 border-2 border-stone-600 rounded-xl p-4 shadow-lg space-y-3">
                <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <Eye className="w-5 h-5" /> 公開されたクエスト (クリックでコピー)
                </h2>
                {Object.entries(roomData.players || {}).filter(([pUid, pData]) => pData.questPublic && pData.questId).length === 0 ? (
                  <p className="text-sm text-stone-500 border border-dashed border-stone-700 rounded-lg p-4">まだ公開されたクエストはありません。</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(roomData.players || {}).filter(([pUid, pData]) => pData.questPublic && pData.questId).map(([pUid, pData]) => {
                      const publicQuest = QUEST_CARDS.find(q => q.id === pData.questId);
                      if (!publicQuest) return null;
                      return (
                        <div 
                          key={pUid} 
                          onClick={() => {
                            const copyText = `【公開クエスト】${pData.name}：${publicQuest.name} (#${publicQuest.id})\n公開条件: ${publicQuest.condition}\n経験点: ${publicQuest.exp}\n目標・イベント: ${publicQuest.judge}\nクリア条件: ${publicQuest.clear}\n報酬: ${publicQuest.reward}`;
                            showCopyToast(copyText);
                          }}
                          className="rounded-xl bg-stone-950 p-4 space-y-2 cursor-pointer hover:border-emerald-400 transition" 
                          style={{ border: "2px solid #065f46", boxSizing: "border-box", display: "inline-block", width: "fit-content", maxWidth: "100%" }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-bold text-emerald-300">{pData.name}：{publicQuest.name}</h3>
                            <span className="text-xs border border-emerald-800 rounded px-2 py-1 text-emerald-300">公開中 (クリックでコピー)</span>
                          </div>
                          <p className="text-xs text-stone-400">公開条件：{publicQuest.condition} ／ 経験点：{publicQuest.exp}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <p className="rounded border border-stone-700 p-2"><strong className="text-amber-400">目標・イベント：</strong>{publicQuest.judge}</p>
                            <p className="rounded border border-stone-700 p-2"><strong className="text-amber-400">クリア条件：</strong>{publicQuest.clear}</p>
                            <p className="rounded border border-stone-700 p-2 md:col-span-2"><strong className="text-amber-400">報酬：</strong>{publicQuest.reward}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

        {/* 下部に固定配置された共有ダイス & ログ・チャットエリア */}
        <section className="bg-stone-900 border-2 border-stone-600 rounded-xl p-3 flex flex-col min-h-56 h-64 shrink-0 shadow-2xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Dices className="w-4 h-4" /> 共有ダイス & セッションログ
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleRollSharedDice(1, "1D6ダイス")}
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-1 rounded border border-stone-700 font-bold"
              >
                1D6 振る
              </button>
              <button 
                onClick={() => handleRollSharedDice(2, "2D6ダイス")}
                className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs px-3 py-1 rounded border border-stone-700 font-bold"
              >
                2D6 振る
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs font-mono pr-2">
            {roomData.logs?.map((log) => (
              <div key={log.id} className="bg-stone-950 p-1.5 rounded-md border border-stone-600 flex items-start gap-2">
                <span className="text-[10px] text-stone-500 shrink-0 pt-0.5">{log.time}</span>
                <span className="font-bold text-amber-500 shrink0">{log.sender}:</span>
                <span className="text-stone-300 font-sans">{log.text}</span>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendMessage} className="mt-2 flex gap-2 pt-2 border-t border-stone-800">
            <input 
              type="text" 
              value={chatMessage} 
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="メッセージや判定結果を発言..." 
              className="flex-1 bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-sans"
            />
            <button 
              type="submit"
              className="bg-amber-700 hover:bg-amber-600 text-amber-100 text-xs font-bold px-4 py-1.5 rounded transition shadow"
            >
              送信
            </button>
          </form>
        </section>

      </div>

    </div>
  );
}