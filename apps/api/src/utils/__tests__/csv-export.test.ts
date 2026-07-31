import { describe, it, expect } from "vitest";
import { buildCsv, parseColumnsParam, type CsvBusinessRow } from "../csv-export.js";

const BIZ: CsvBusinessRow = {
  name: "Boulangerie; du \"Port\"",
  siret: "12345678900011",
  siren: "123456789",
  entityType: "COMMERCE",
  apeCode: "4711B",
  legalForm: "SARL",
  employeesRange: "1-2",
  address: "1 rue du Port",
  postalCode: "13600",
  city: "La Ciotat",
  phone: "+33 4 42 00 00 00",
  website: "https://exemple.fr",
  isHeadquarters: true,
  analysis: {
    seoScore: 42,
    digitalScore: 61,
    priority: "HIGH",
    status: "COMPLETED",
    contactEmails: ["a@exemple.fr", "b@exemple.fr"],
  },
};

describe("parseColumnsParam", () => {
  it("retourne toutes les colonnes sans paramètre", () => {
    expect(parseColumnsParam(undefined)).toContain("name");
    expect(parseColumnsParam(undefined).length).toBeGreaterThan(10);
  });

  it("filtre sur les clés demandées en ignorant les inconnues", () => {
    expect(parseColumnsParam("city,unknown,phone")).toEqual(["city", "phone"]);
  });

  it("retombe sur tout si aucune clé valide", () => {
    expect(parseColumnsParam("foo,bar").length).toBeGreaterThan(10);
  });
});

describe("buildCsv", () => {
  it("ne sort que les colonnes demandées, dans l'ordre canonique", () => {
    const csv = buildCsv([BIZ], parseColumnsParam("phone,name,emails"));
    const [header, row] = csv.replace(/^﻿/, "").split("\n");
    expect(header).toBe("Nom;Téléphone;Emails");
    expect(row).toContain("+33 4 42 00 00 00");
    expect(row).toContain("a@exemple.fr, b@exemple.fr");
  });

  it("échappe séparateurs et guillemets", () => {
    const csv = buildCsv([BIZ], parseColumnsParam("name"));
    expect(csv).toContain('"Boulangerie; du ""Port"""');
  });

  it("neutralise les débuts de formule Excel (= et @) sans toucher aux téléphones", () => {
    const evil: CsvBusinessRow = { ...BIZ, name: "=HYPERLINK(\"http://evil\")", analysis: null };
    const csv = buildCsv([evil], parseColumnsParam("name,phone"));
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("+33 4 42 00 00 00");
    expect(csv).not.toContain("'+33");
  });

  it("gère l'analyse absente", () => {
    const noAnalysis: CsvBusinessRow = { ...BIZ, name: "Simple", analysis: null };
    const csv = buildCsv([noAnalysis], parseColumnsParam("name,seoScore,emails"));
    const row = csv.replace(/^﻿/, "").split("\n")[1];
    expect(row.split(";")).toEqual(["Simple", "", ""]);
  });
});
