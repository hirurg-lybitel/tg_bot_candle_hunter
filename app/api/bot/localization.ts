import { Language, TimeInterval, TimeIntervalType } from "@/types";

export const parseStringToMD = (str: string) => str
  .replaceAll('.', '\\.')
  .replaceAll('+', '\\+')
  .replaceAll('-', '\\-');

export const getSettingsTitle = (lang: Language, coinsNumber: number) => {
  switch (lang) {
    case 'ru':
      return `*Настройки бота*\n\nМонет мониторится: ${coinsNumber}\\.\n\nВыберите один из параметров, который вы хотите изменить\\.`;
    case 'by': 
      return `*Налады бота*\n\nМанет маніторыцца: ${coinsNumber}\\.\n\nАбярыце адзін з параметраў, які вы хочаце змяніць\\.`;
    default:
      return '';
  }
};

export const getTimeIntervalTitle = (lang: Language, interval: TimeInterval) => {
  switch (lang) {
    case 'ru':
      return parseStringToMD(`Текущий временной интервал: *${interval.value}* ${getIntervalLabel(lang, interval.type)}\n\nИзменение цены, за какой промежуток времени следует отслеживать.\n\nВведите новое значение:`);
    case 'by': 
      return parseStringToMD(`Бягучы часавы інтэрвал: *${interval.value}* ${getIntervalLabel(lang, interval.type)}\n\nЗмяненне кошту, за які прамежак часу варта адсочваць.\n\nУвядзіце новае значэнне:`);
    default:
      return '';
  }
};

export const getTimeIntervalCategoryTitle = (lang: Language, interval: TimeInterval) => {
  switch (lang) {
    case 'ru':
      return parseStringToMD(`Текущий временной интервал: *${interval.value}* ${getIntervalLabel(lang, interval.type)}\n\nИзменение цены, за какой промежуток времени следует отслеживать.\n\nВыберите новое значение:`);
    case 'by': 
      return parseStringToMD(`Бягучы часавы інтэрвал: *${interval.value}* ${getIntervalLabel(lang, interval.type)}\n\nЗмяненне кошту, за які прамежак часу варта адсочваць.\n\nАбярыце новую катэгорыю:`);
    default:
      return '';
  }
};


export const getPercentTitle = (lang: Language, value: number) => {
  switch (lang) {
    case 'ru':
      return `Текущий процент изменения: *${value}* %\\.\n\nО каком изменении цены за указанный промежуток времени стоит уведомлять\\.\n\nВведите новое значение в процентах:`;
    case 'by': 
      return `Бягучы адсотак змены: *${value}* %\\.\n\nАб якой змене цаны за ўказаны прамежак часу варта паведамляць\\.\n\nУвядзіце новае значэнне ў адсотках:`;
    default:
      return '';
  }
};


export const getIntervalLabel = (lang: Language, value: TimeIntervalType) => {
  switch (lang) {
    case 'ru':
      switch (value) {
        case 'minutes':
          return 'мин.';
        case 'hours':
          return 'ч.';
        case 'days':
          return 'дн.';
        case 'months':
          return 'мес.';      
        default:
          return '';
      }
    case 'by': 
      switch (value) {
        case 'minutes':
          return 'хв.';
        case 'hours':
          return 'г.';
        case 'days':
          return 'дн.';
        case 'months':
          return 'мес.';      
        default:
          return '';
      }
    default:
      return '';
  }
};

export const getTimeInfo = (lang: Language, interval: TimeInterval) => {
  switch (lang) {
    case 'ru':
      return `Время: ${interval.value} ${getIntervalLabel(lang, interval.type)}`;
    case 'by': 
      return `Час: ${interval.value} ${getIntervalLabel(lang, interval.type)}`;
    default:
      return '';
  }
};

export const getPercentInfo = (lang: Language, value: number) => {
  switch (lang) {
    case 'ru':
      return `Процент: ${value}`;
    case 'by': 
      return `Адсодак: ${value}`;
    default:
      return '';
  }
};

export const getLanguageInfo = (
  lang: Language, 
  value: string
) => {
  switch (lang) {
    case 'ru':
      return `Язык ${value}`;
    case 'by': 
      return `Мова ${value}`;
    default:
      return '';
  }
};

export const getNotificationMessage = (
  lang: Language,
  coinName: string,
  percentChange: number,
  interval: TimeInterval,
  lastPrice: number
) => {
  const isPositive = percentChange > 0;

  switch (lang) {
    case 'ru':
      return parseStringToMD(`${isPositive? '📈' : '📉'} *${coinName}*\n${isPositive ? '+' : '-'}${Math.abs(percentChange)}% за ${interval.value} ${getIntervalLabel(lang, interval.type)}\nТекущая цена ${lastPrice}.`);
    case 'by': 
      return parseStringToMD(`${isPositive? '📈' : '📉'} *${coinName}*\n${isPositive ? '+' : '-'}${Math.abs(percentChange)}% за ${interval.value} ${getIntervalLabel(lang, interval.type)}\nБягучы кошт ${lastPrice}.`);
    default:
      return '';
  }
};