/**
 * Deterministic sample organisations for demos (Story 5.1 / 6.3).
 * Fixed UUIDs + upsert in seed.js — see docs/decisions.md (ADR-014).
 * Each row uses `links`: adopted systems via `organisation_system` (v2).
 */

const SAMPLE_ORGANISATIONS = [
  {
    "id": "5e1a0001-0001-4001-8001-000000000001",
    "name": "Royal Albert Hall",
    "city": "London",
    "country": "United Kingdom",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "YES",
    "source_reference": "https://www.royalalberthall.com/",
    "notes": "Victorian concert hall; Royal Albert Hall Trust.",
    "capacity": 5272,
    "created_at": "2021-03-15T10:30:00.000Z",
    "last_updated": "2024-01-20T14:00:00.000Z",
    "links": [
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "https://www.royalalberthall.com/"
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "https://www.royalalberthall.com/"
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000002",
    "name": "Edinburgh Festival Fringe Society",
    "city": "Edinburgh",
    "country": "United Kingdom",
    "organisationTypeName": "Festival",
    "membership_capability": "YES",
    "donation_capability": "YES",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Fringe programme archive (2023 season).",
    "notes": "Open-access arts festival.",
    "capacity": null,
    "created_at": "2019-07-01T09:00:00.000Z",
    "last_updated": "2023-11-05T16:30:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Fringe programme archive (2023 season)."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Fringe programme archive (2023 season)."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000003",
    "name": "AEG Presents UK",
    "city": "London",
    "country": "United Kingdom",
    "organisationTypeName": "Promoter",
    "membership_capability": "NO",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "NO",
    "source_reference": "https://www.aegpresents.co.uk/",
    "notes": null,
    "capacity": null,
    "created_at": "2020-02-14T11:15:00.000Z",
    "last_updated": "2024-06-01T08:45:00.000Z",
    "links": [
      {
        "systemName": "Ticketmaster",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "https://www.aegpresents.co.uk/"
      },
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "https://www.aegpresents.co.uk/"
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000004",
    "name": "Barbican Centre",
    "city": "London",
    "country": "United Kingdom",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "UNKNOWN",
    "donation_capability": "YES",
    "reserved_seating_capability": "NO",
    "source_reference": "City of London Corporation arts venue listing.",
    "notes": "Multi-arts centre.",
    "capacity": 1943,
    "created_at": "2018-05-22T13:20:00.000Z",
    "last_updated": "2023-03-10T12:00:00.000Z",
    "links": [
      {
        "systemName": "PatronBase",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "City of London Corporation arts venue listing."
      },
      {
        "systemName": "Donorfy",
        "role": "PRIMARY_CRM",
        "sourceReference": "City of London Corporation arts venue listing."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000005",
    "name": "Southbank Centre",
    "city": "London",
    "country": "United Kingdom",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "https://www.southbankcentre.co.uk/",
    "notes": "No single primary box office — provider left unset for demo nulls.",
    "capacity": null,
    "created_at": "2017-01-10T08:00:00.000Z",
    "last_updated": "2022-09-18T17:10:00.000Z",
    "links": [
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "https://www.southbankcentre.co.uk/"
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000006",
    "name": "Sydney Opera House",
    "city": "Sydney",
    "country": "Australia",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "YES",
    "reserved_seating_capability": "YES",
    "source_reference": "https://www.sydneyoperahouse.com/",
    "notes": null,
    "capacity": 5738,
    "created_at": "2021-09-30T14:45:00.000Z",
    "last_updated": "2024-02-28T09:30:00.000Z",
    "links": [
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "https://www.sydneyoperahouse.com/"
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "https://www.sydneyoperahouse.com/"
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000007",
    "name": "Arts Centre Melbourne",
    "city": "Melbourne",
    "country": "Australia",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "NO",
    "donation_capability": "NO",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Victorian Arts Centre Trust annual report (excerpt).",
    "notes": null,
    "capacity": null,
    "created_at": "2016-11-12T10:00:00.000Z",
    "last_updated": "2023-07-22T15:20:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Victorian Arts Centre Trust annual report (excerpt)."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000008",
    "name": "Berlin Philharmonie",
    "city": "Berlin",
    "country": "Germany",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "YES",
    "source_reference": "Berliner Philharmoniker ticketing pages.",
    "notes": null,
    "capacity": 2440,
    "created_at": "2019-04-03T07:30:00.000Z",
    "last_updated": "2024-04-12T11:00:00.000Z",
    "links": [
      {
        "systemName": "AudienceView",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Berliner Philharmoniker ticketing pages."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Berliner Philharmoniker ticketing pages."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000009",
    "name": "Tomorrowland",
    "city": "Boom",
    "country": "Belgium",
    "organisationTypeName": "Festival",
    "membership_capability": "UNKNOWN",
    "donation_capability": "NO",
    "reserved_seating_capability": "NO",
    "source_reference": "Tomorrowland NV — public event information.",
    "notes": "Electronic music festival.",
    "capacity": 75000,
    "created_at": "2015-08-20T12:00:00.000Z",
    "last_updated": "2023-12-01T18:00:00.000Z",
    "links": [
      {
        "systemName": "Eventbrite",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Tomorrowland NV — public event information."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000000a",
    "name": "Live Nation France",
    "city": "Paris",
    "country": "France",
    "organisationTypeName": "Promoter",
    "membership_capability": "NO",
    "donation_capability": "YES",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Live Nation Entertainment subsidiary listing.",
    "notes": null,
    "capacity": null,
    "created_at": "2020-10-01T09:15:00.000Z",
    "last_updated": "2024-05-30T13:40:00.000Z",
    "links": [
      {
        "systemName": "Ticketmaster",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Live Nation Entertainment subsidiary listing."
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "Live Nation Entertainment subsidiary listing."
      },
      {
        "systemName": "Universe",
        "role": "SECONDARY",
        "note": "Secondary channel for selected runs."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000000b",
    "name": "Teatro alla Scala",
    "city": "Milan",
    "country": "Italy",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Fondazione Teatro alla Scala — visitor information.",
    "notes": null,
    "capacity": 2030,
    "created_at": "2017-06-18T16:00:00.000Z",
    "last_updated": "2022-11-11T10:25:00.000Z",
    "links": [
      {
        "systemName": "Ticketsolve",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Fondazione Teatro alla Scala — visitor information."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000000c",
    "name": "Det Kongelige Teater",
    "city": "Copenhagen",
    "country": "Denmark",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "UNKNOWN",
    "donation_capability": "YES",
    "reserved_seating_capability": "YES",
    "source_reference": "Royal Danish Theatre — English programme notes.",
    "notes": null,
    "capacity": null,
    "created_at": "2018-12-05T11:30:00.000Z",
    "last_updated": "2023-08-19T14:15:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Royal Danish Theatre — English programme notes."
      },
      {
        "systemName": "Donorfy",
        "role": "PRIMARY_CRM",
        "sourceReference": "Royal Danish Theatre — English programme notes."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000000d",
    "name": "Den Norske Opera & Ballett",
    "city": "Oslo",
    "country": "Norway",
    "organisationTypeName": "Venue",
    "membership_capability": "NO",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "NO",
    "source_reference": "Operaen Oslo — box office FAQ.",
    "notes": null,
    "capacity": 1364,
    "created_at": "2019-01-25T08:50:00.000Z",
    "last_updated": "2024-01-05T07:00:00.000Z",
    "links": [
      {
        "systemName": "PatronBase",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Operaen Oslo — box office FAQ."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Operaen Oslo — box office FAQ."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000000e",
    "name": "Esplanade – Theatres on the Bay",
    "city": "Singapore",
    "country": "Singapore",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "YES",
    "source_reference": "https://www.esplanade.com/",
    "notes": null,
    "capacity": 2000,
    "created_at": "2021-04-10T12:20:00.000Z",
    "last_updated": "2024-07-08T16:50:00.000Z",
    "links": [
      {
        "systemName": "Universe",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "https://www.esplanade.com/"
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "https://www.esplanade.com/"
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000000f",
    "name": "Chicago Symphony Orchestra Association",
    "city": "Chicago",
    "country": "United States",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "YES",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "CSOA subscription brochure (citation).",
    "notes": "Symphony Center.",
    "capacity": 2525,
    "created_at": "2016-03-08T15:00:00.000Z",
    "last_updated": "2023-02-14T09:35:00.000Z",
    "links": [
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "CSOA subscription brochure (citation)."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000010",
    "name": "Los Angeles Philharmonic Association",
    "city": "Los Angeles",
    "country": "United States",
    "organisationTypeName": "Venue",
    "membership_capability": "NO",
    "donation_capability": "NO",
    "reserved_seating_capability": "YES",
    "source_reference": "Walt Disney Concert Hall — LA Phil.",
    "notes": null,
    "capacity": 2265,
    "created_at": "2018-08-30T10:10:00.000Z",
    "last_updated": "2024-03-21T13:05:00.000Z",
    "links": [
      {
        "systemName": "Ticketmaster",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Walt Disney Concert Hall — LA Phil."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Walt Disney Concert Hall — LA Phil."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000011",
    "name": "Royal Concertgebouw",
    "city": "Amsterdam",
    "country": "Netherlands",
    "organisationTypeName": "Venue",
    "membership_capability": "UNKNOWN",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "https://www.concertgebouw.nl/",
    "notes": "Capability triplet all UNKNOWN for filter demos.",
    "capacity": 1974,
    "created_at": "2015-02-28T14:00:00.000Z",
    "last_updated": "2022-06-06T11:11:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "https://www.concertgebouw.nl/"
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000012",
    "name": "Glyndebourne Festival Society",
    "city": "Lewes",
    "country": "United Kingdom",
    "organisationTypeName": "Festival",
    "membership_capability": "YES",
    "donation_capability": "YES",
    "reserved_seating_capability": "YES",
    "source_reference": "Glyndebourne Festival — season brochure.",
    "notes": "Opera festival; seed row for pagination demos.",
    "capacity": 1200,
    "created_at": "2014-05-12T09:00:00.000Z",
    "last_updated": "2024-08-01T10:00:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Glyndebourne Festival — season brochure."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Glyndebourne Festival — season brochure."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000013",
    "name": "National Theatre",
    "city": "London",
    "country": "United Kingdom",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "NO",
    "source_reference": "National Theatre Trust — ticketing pages.",
    "notes": null,
    "capacity": 2250,
    "created_at": "2013-09-03T11:20:00.000Z",
    "last_updated": "2023-10-15T14:30:00.000Z",
    "links": [
      {
        "systemName": "PatronBase",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "National Theatre Trust — ticketing pages."
      },
      {
        "systemName": "Donorfy",
        "role": "PRIMARY_CRM",
        "sourceReference": "National Theatre Trust — ticketing pages."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000014",
    "name": "Royal Opera House",
    "city": "London",
    "country": "United Kingdom",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "YES",
    "source_reference": "Royal Opera House Covent Garden — visitor guide.",
    "notes": null,
    "capacity": 2256,
    "created_at": "2012-01-18T08:45:00.000Z",
    "last_updated": "2024-09-12T16:00:00.000Z",
    "links": [
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Royal Opera House Covent Garden — visitor guide."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000015",
    "name": "International Theatre Amsterdam",
    "city": "Amsterdam",
    "country": "Netherlands",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "NO",
    "donation_capability": "YES",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "ITA — former Stadsschouwburg programming.",
    "notes": null,
    "capacity": 900,
    "created_at": "2016-06-07T13:00:00.000Z",
    "last_updated": "2023-04-22T09:10:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "ITA — former Stadsschouwburg programming."
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "ITA — former Stadsschouwburg programming."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000016",
    "name": "Elbphilharmonie Hamburg",
    "city": "Hamburg",
    "country": "Germany",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "YES",
    "source_reference": "Elbphilharmonie GmbH — hall capacities.",
    "notes": null,
    "capacity": 2100,
    "created_at": "2017-11-11T12:30:00.000Z",
    "last_updated": "2024-02-01T11:20:00.000Z",
    "links": [
      {
        "systemName": "AudienceView",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Elbphilharmonie GmbH — hall capacities."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Elbphilharmonie GmbH — hall capacities."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000017",
    "name": "Philharmonie de Paris",
    "city": "Paris",
    "country": "France",
    "organisationTypeName": "Venue",
    "membership_capability": "UNKNOWN",
    "donation_capability": "YES",
    "reserved_seating_capability": "YES",
    "source_reference": "Cité de la musique — Philharmonie ticketing.",
    "notes": null,
    "capacity": 2400,
    "created_at": "2015-10-02T15:15:00.000Z",
    "last_updated": "2022-12-20T08:00:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Cité de la musique — Philharmonie ticketing."
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "Cité de la musique — Philharmonie ticketing."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000018",
    "name": "Gran Teatre del Liceu",
    "city": "Barcelona",
    "country": "Spain",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Fundació del Gran Teatre del Liceu.",
    "notes": null,
    "capacity": 2292,
    "created_at": "2014-03-20T10:00:00.000Z",
    "last_updated": "2023-06-30T17:45:00.000Z",
    "links": [
      {
        "systemName": "Ticketsolve",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Fundació del Gran Teatre del Liceu."
      },
      {
        "systemName": "Donorfy",
        "role": "PRIMARY_CRM",
        "sourceReference": "Fundació del Gran Teatre del Liceu."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000019",
    "name": "Théâtre des Champs-Élysées",
    "city": "Paris",
    "country": "France",
    "organisationTypeName": "Venue",
    "membership_capability": "NO",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "NO",
    "source_reference": "TCE — historical venue programme.",
    "notes": null,
    "capacity": 1905,
    "created_at": "2011-07-14T09:30:00.000Z",
    "last_updated": "2024-05-18T13:25:00.000Z",
    "links": [
      {
        "systemName": "PatronBase",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "TCE — historical venue programme."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "TCE — historical venue programme."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000001a",
    "name": "Wiener Staatsoper",
    "city": "Vienna",
    "country": "Austria",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "YES",
    "reserved_seating_capability": "YES",
    "source_reference": "Wiener Staatsoper — subscription office.",
    "notes": null,
    "capacity": 1709,
    "created_at": "2010-12-01T08:00:00.000Z",
    "last_updated": "2024-01-28T12:00:00.000Z",
    "links": [
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Wiener Staatsoper — subscription office."
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "Wiener Staatsoper — subscription office."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000001b",
    "name": "Musikverein Wien",
    "city": "Vienna",
    "country": "Austria",
    "organisationTypeName": "Venue",
    "membership_capability": "NO",
    "donation_capability": "NO",
    "reserved_seating_capability": "YES",
    "source_reference": "Gesellschaft der Musikfreunde — Golden Hall.",
    "notes": null,
    "capacity": 1744,
    "created_at": "2009-04-25T14:40:00.000Z",
    "last_updated": "2023-11-08T10:50:00.000Z",
    "links": [
      {
        "systemName": "Spektrix",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Gesellschaft der Musikfreunde — Golden Hall."
      },
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Gesellschaft der Musikfreunde — Golden Hall."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000001c",
    "name": "Concertgebouw Brugge",
    "city": "Bruges",
    "country": "Belgium",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "UNKNOWN",
    "donation_capability": "YES",
    "reserved_seating_capability": "YES",
    "source_reference": "Concertgebouw Brugge — annual report excerpt.",
    "notes": null,
    "capacity": 1290,
    "created_at": "2018-02-19T11:11:00.000Z",
    "last_updated": "2022-08-14T15:00:00.000Z",
    "links": [
      {
        "systemName": "Ticketsolve",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Concertgebouw Brugge — annual report excerpt."
      },
      {
        "systemName": "Donorfy",
        "role": "PRIMARY_CRM",
        "sourceReference": "Concertgebouw Brugge — annual report excerpt."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000001d",
    "name": "Cork Opera House",
    "city": "Cork",
    "country": "Ireland",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "NO",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Cork Opera House Trust.",
    "notes": null,
    "capacity": 1000,
    "created_at": "2019-08-08T16:20:00.000Z",
    "last_updated": "2024-06-02T09:05:00.000Z",
    "links": [
      {
        "systemName": "PatronBase",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Cork Opera House Trust."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "Cork Opera House Trust."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000001e",
    "name": "Tokyo Bunka Kaikan",
    "city": "Tokyo",
    "country": "Japan",
    "organisationTypeName": "Cultural Organisation",
    "membership_capability": "NO",
    "donation_capability": "YES",
    "reserved_seating_capability": "NO",
    "source_reference": "Tokyo Metropolitan Foundation for History and Culture.",
    "notes": null,
    "capacity": 2303,
    "created_at": "2020-01-30T07:00:00.000Z",
    "last_updated": "2023-05-11T12:30:00.000Z",
    "links": [
      {
        "systemName": "Universe",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "Tokyo Metropolitan Foundation for History and Culture."
      },
      {
        "systemName": "Salesforce",
        "role": "PRIMARY_CRM",
        "sourceReference": "Tokyo Metropolitan Foundation for History and Culture."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-00000000001f",
    "name": "Massey Hall",
    "city": "Toronto",
    "country": "Canada",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "UNKNOWN",
    "reserved_seating_capability": "YES",
    "source_reference": "The Corporation of Massey Hall and Roy Thomson Hall.",
    "notes": null,
    "capacity": 2752,
    "created_at": "2021-06-21T13:45:00.000Z",
    "last_updated": "2024-07-19T14:15:00.000Z",
    "links": [
      {
        "systemName": "Ticketmaster",
        "role": "PRIMARY_TICKETING",
        "sourceReference": "The Corporation of Massey Hall and Roy Thomson Hall."
      },
      {
        "systemName": "HubSpot",
        "role": "PRIMARY_CRM",
        "sourceReference": "The Corporation of Massey Hall and Roy Thomson Hall."
      }
    ]
  },
  {
    "id": "5e1a0001-0001-4001-8001-000000000020",
    "name": "Seattle Symphony",
    "city": "Seattle",
    "country": "United States",
    "organisationTypeName": "Venue",
    "membership_capability": "YES",
    "donation_capability": "YES",
    "reserved_seating_capability": "UNKNOWN",
    "source_reference": "Benaroya Hall — Seattle Symphony subscription.",
    "notes": null,
    "capacity": 2500,
    "created_at": "2017-03-05T10:05:00.000Z",
    "last_updated": "2024-03-03T18:40:00.000Z",
    "links": [
      {
        "systemName": "Tessitura",
        "role": "INTEGRATED_SUITE",
        "sourceReference": "Benaroya Hall — Seattle Symphony subscription."
      }
    ]
  }
];

module.exports = { SAMPLE_ORGANISATIONS };
