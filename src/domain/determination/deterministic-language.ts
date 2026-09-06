import type {
  DeterminationLanguage,
  DeterminationLanguageCommand,
} from "./determination-language";
import { createEnglishChronologyFallback } from "./locales/en";
import { createEnglishDigitalConductFallback } from "./locales/en-digital-conduct";
import { createEnglishDomesticAffairsFallback } from "./locales/en-domestic-affairs";
import { createEnglishSocialPlanningFallback } from "./locales/en-social-planning";
import * as french from "./locales/fr";
import * as german from "./locales/de";
import * as italian from "./locales/it";
import * as brazilianPortuguese from "./locales/pt-BR";
import * as spanish from "./locales/es";

export function createDeterministicDeterminationLanguage(
  command: DeterminationLanguageCommand,
): DeterminationLanguage {
  switch (command.locale) {
    case "it":
      if (command.department === "chronology")
        return italian.createItalianChronologyFallback(command);
      if (command.department === "digital_conduct")
        return italian.createItalianDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return italian.createItalianDomesticAffairsFallback(command);
      return italian.createItalianSocialPlanningFallback(command);
    case "fr":
      if (command.department === "chronology")
        return french.createFrenchChronologyFallback(command);
      if (command.department === "digital_conduct")
        return french.createFrenchDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return french.createFrenchDomesticAffairsFallback(command);
      return french.createFrenchSocialPlanningFallback(command);
    case "de":
      if (command.department === "chronology")
        return german.createGermanChronologyFallback(command);
      if (command.department === "digital_conduct")
        return german.createGermanDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return german.createGermanDomesticAffairsFallback(command);
      return german.createGermanSocialPlanningFallback(command);
    case "es":
      if (command.department === "chronology")
        return spanish.createSpanishChronologyFallback(command);
      if (command.department === "digital_conduct")
        return spanish.createSpanishDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return spanish.createSpanishDomesticAffairsFallback(command);
      return spanish.createSpanishSocialPlanningFallback(command);
    case "pt-BR":
      if (command.department === "chronology")
        return brazilianPortuguese.createBrazilianPortugueseChronologyFallback(
          command,
        );
      if (command.department === "digital_conduct")
        return brazilianPortuguese.createBrazilianPortugueseDigitalConductFallback(
          command,
        );
      if (command.department === "domestic_affairs")
        return brazilianPortuguese.createBrazilianPortugueseDomesticAffairsFallback(
          command,
        );
      return brazilianPortuguese.createBrazilianPortugueseSocialPlanningFallback(
        command,
      );
    case "en":
      if (command.department === "chronology")
        return createEnglishChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createEnglishDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createEnglishDomesticAffairsFallback(command);
      return createEnglishSocialPlanningFallback(command);
  }
}
