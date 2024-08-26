import { Language } from "@/types";

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

export const getTimeIntervalTitle = (lang: Language, value: number) => {
  switch (lang) {
    case 'ru':
      return `Текущий временной интервал: *${value}* мин\\.\n\nИзменение цены, за какой промежуток времени следует отслеживать\\.\n\nВведите новое значение в минутах:`;
    case 'by': 
      return `Бягучы часавы інтэрвал: *${value}* мін\\.\n\nЗмяненне кошту, за які прамежак часу варта адсочваць\\.\n\nУвядзіце новае значэнне ў хвілінах:`;
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