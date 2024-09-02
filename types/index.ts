export interface SessionData {
    userConfig: UserConfig;
    userStates: UserStates;
}
  
export const languages = ['by', 'ru'] as const;
export type Language = typeof languages[number];

export const flags = new Map<Language, string>([
  ['by', '🇧🇾'],
  ['ru', '🇷🇺']
]);

export interface UserStates {
    [key: number]: "waitPercent" | "waitTimeIntervalMinutes" | "waitTimeIntervalHours" | "waitTimeIntervalDays" | "waitTimeIntervalMonths";
  }

export type TimeIntervalType = 'minutes' | 'hours' | 'days' | 'months';
export type TimeInterval = {
    type: TimeIntervalType,
    value: number;
}

export type BotConfig = {
    percent: number;
    lang: Language;
    interval: TimeInterval;
}

export type TrackedPrices = {
    [key: string]: {
        prevPrice?: number;
        lastPrice?: number;
    }
};

export type UserConfig = {
    botConfig?: BotConfig;
    cronJobId?: number;
    prices?: TrackedPrices;
    coinListUTF16?: string;
    pricesUTF16?: string;
}

export type CoinsList = {
    [key: string]: {
        name: string;
        coinName: string;
    }
}

export type CMC_CoinInfo = {
    id: number;
    rank: string;
    name: string;
    symbol: string;
    slug: string;
    is_active: number;
    first_historical_data: string;
    last_historical_data: string;
}

export enum RequestMethod {
    GET = 0,
    POST = 1,
    OPTIONS = 2,
    HEAD = 3,
    PUT = 4,
    DELETE = 5,
    TRACE = 6,
    CONNECT = 7,
    PATCH = 8
}


// PSUSHI: {
//     Id: '966970',
//     Url: '/coins/psushi/overview',
//     ImageUrl: '/media/45673722/psushi.png',
//     ContentCreatedOn: 1724429127,
//     Name: 'PSUSHI',
//     Symbol: 'PSUSHI',
//     CoinName: 'Sushi (Polygon Portal)',
//     FullName: 'Sushi (Polygon Portal) (PSUSHI)',
//     Description: 'For clear data distinction, this token initially issued as SUSHI, bridged onto the Polygon network by Polygon Portal, is listed under the alternative ticker PSUSHI. This helps accurately identify and differentiate it from the original assets. PSUSHI operates independently with its own governance and unique features, as managed by Polygon Portal.',
//     AssetTokenStatus: 'N/A',
//     Algorithm: 'N/A',
//     ProofType: 'N/A',
//     SortOrder: '16242',
//     Sponsored: false,
//     Taxonomy: [Object],
//     Rating: [Object],
//     IsTrading: false,
//     TotalCoinsMined: 0,
//     CirculatingSupply: 0,
//     BlockNumber: 0,
//     NetHashesPerSecond: 0,
//     BlockReward: 0,
//     BlockTime: 0,
//     AssetLaunchDate: '2021-02-05',
//     AssetWhitepaperUrl: '',
//     AssetWebsiteUrl: 'https://portal.polygon.technology/bridge',
//     MaxSupply: -1,
//     MktCapPenalty: 0,
//     IsUsedInDefi: 0,
//     IsUsedInNft: 0,
//     PlatformType: 'token',
//     BuiltOn: 'MATIC',
//     SmartContractAddress: '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a',
//     OtherSmartContractAddress: 'MATIC:0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a',
//     DecimalPoints: 18
//   }