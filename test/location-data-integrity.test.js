import assert from "node:assert/strict";
import { test } from "node:test";
import { getDestinationEtiquetteAndTips, getQuickFactsForDestination } from "../src/services/destinationService.js";

test("location data integrity: local language matches destination country", () => {
  const spainFacts = getQuickFactsForDestination("Seville, Spain");
  assert.equal(spainFacts.language.includes("Spanish"), true, "Spain language must be Spanish");

  const franceFacts = getQuickFactsForDestination("Nice, France");
  assert.equal(franceFacts.language, "French", "France language must be French");

  const japanFacts = getQuickFactsForDestination("Kyoto, Japan");
  assert.equal(japanFacts.language, "Japanese", "Japan language must be Japanese");

  const swedenFacts = getQuickFactsForDestination("Stockholm, Sweden");
  assert.equal(swedenFacts.language.includes("Swedish"), true, "Sweden language must be Swedish");

  const italyFacts = getQuickFactsForDestination("Florence, Italy");
  assert.equal(italyFacts.language, "Italian", "Italy language must be Italian");

  const germanyFacts = getQuickFactsForDestination("Munich, Germany");
  assert.equal(germanyFacts.language, "German", "Germany language must be German");
});

test("location data integrity: currency matches country specification", () => {
  assert.equal(getQuickFactsForDestination("Madrid, Spain").currency, "EUR (€)");
  assert.equal(getQuickFactsForDestination("London, UK").currency, "GBP (£)");
  assert.equal(getQuickFactsForDestination("New York, USA").currency, "USD ($)");
  assert.equal(getQuickFactsForDestination("Tokyo, Japan").currency, "JPY (¥)");
  assert.equal(getQuickFactsForDestination("Stockholm, Sweden").currency, "SEK (kr)");
  assert.equal(getQuickFactsForDestination("Sydney, Australia").currency, "AUD ($)");
  assert.equal(getQuickFactsForDestination("Bangkok, Thailand").currency, "THB (฿)");
});

test("location data integrity: population facts are authentic per city and not generic 1.2M", () => {
  const paris = getQuickFactsForDestination("Paris, France");
  assert.equal(paris.population, "2.1 million");

  const london = getQuickFactsForDestination("London, UK");
  assert.equal(london.population, "8.9 million");

  const tokyo = getQuickFactsForDestination("Tokyo, Japan");
  assert.equal(tokyo.population, "14.0 million");

  const stockholm = getQuickFactsForDestination("Stockholm, Sweden");
  assert.equal(stockholm.population, "975,000");

  const customCity = getQuickFactsForDestination("Valencia, Spain");
  assert.notEqual(customCity.population, "1.2 million", "Custom fallback must not output legacy hardcoded 1.2M default");
});

test("location data integrity: emergency numbers and cultural tips match destination", () => {
  const ukEtiquette = getDestinationEtiquetteAndTips("London, UK");
  assert.equal(ukEtiquette.emergency.includes("999"), true, "UK emergency number must include 999");

  const usEtiquette = getDestinationEtiquetteAndTips("New York, USA");
  assert.equal(usEtiquette.emergency.includes("911"), true, "US emergency number must include 911");

  const franceEtiquette = getDestinationEtiquetteAndTips("Paris, France");
  assert.equal(franceEtiquette.emergency.includes("112"), true, "France emergency number must include 112");
});

test("location data integrity: global coverage for non-European destinations worldwide", () => {
  const peru = getQuickFactsForDestination("Cusco, Peru");
  assert.equal(peru.country, "Peru 🇵🇪");
  assert.equal(peru.currency, "PEN (S/)");
  assert.equal(peru.language.includes("Spanish"), true);

  const southAfrica = getQuickFactsForDestination("Cape Town, South Africa");
  assert.equal(southAfrica.country, "South Africa 🇿🇦");
  assert.equal(southAfrica.currency, "ZAR (R)");

  const uae = getQuickFactsForDestination("Dubai, UAE");
  assert.equal(uae.country, "United Arab Emirates 🇦🇪");
  assert.equal(uae.currency, "AED (DH)");

  const malaysia = getQuickFactsForDestination("Kuala Lumpur, Malaysia");
  assert.equal(malaysia.country, "Malaysia 🇲🇾");
  assert.equal(malaysia.currency, "MYR (RM)");

  const mexico = getQuickFactsForDestination("Oaxaca, Mexico");
  assert.equal(mexico.country, "Mexico 🇲🇽");
  assert.equal(mexico.currency, "MXN ($)");
});
