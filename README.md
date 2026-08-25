# Atlantino

L'***Atlantino*** è uno strumento pensato per lo studio, la memorizzazione e il ripasso [dei siti e dei luoghi d'Italia](https://portale.inpa.gov.it/api/media/d479ec81-a12a-4357-b574-efdea8763846) previsti per l'[esame di conseguimento dell’abilitazione all’esercizio della professione di guida turistica (2026)](https://www.inpa.gov.it/bandi-e-avvisi/dettaglio-bando-avviso/?concorso_id=4eed076c847741c493ad9702ff78f6d6). Per affiancare allo studio teorico anche uno cartografico, ho sviluppato questa web app come esperimento di vibe-coding con Claude Sonnet 5 (Anthropic), pensando a uno spazio di lavoro in cui visualizzare e personalizzare la propria mappa. È uno strumento aperto e libero che spero possa essere utile per i colleghi esaminandi e per chiunque voglia organizzare lo studio del territorio.

## Come usarlo?

Non si tratta di una mappa pronta per l'uso, bensì di uno strumento con cui creare agilmente la tua mappa personale nella maniera che più si confà al tuo metodo di studio, memorizzazione e ripasso. Si basa tutto sul principio della visualizzazione:
1. sulla mappa piazzerai i tuoi segnaposto, a cui assegnerai nomi e colori;
2. in qualsiasi momento potrai cambiare visuale tra cartina parlante, immagine satellitare e cartina muta.

Puoi usare l'***Atlantino*** [cliccando qui](https://nostalgenesis.github.io/atlantino/) oppure scaricando i file di questa repository e aprendo l'index.html altrove.

## Segnaposto
I segnaposto sono pallini di diversi colori con cui segnare i punti sulla mappa. Cliccando su un punto della mappa si aprirà una finestra che permette di personalizzare il segnaposto, dandogli un nome, un colore e inserendo dentro di esso eventuali note. Nomi, colori e note sono modificabili **in qualsiasi momento** anche dopo la loro creazione.

**Tasto *MODALITÀ RIPASSO*:** scorrendo il cursore sopra i segnaposto, comparirà il nome che gli avrete assegnato. Questa funzione è disattivabile e riattivabile con il tasto "MODALITÀ RIPASSO".

**Come funzionano i segnaposto:**
L'Atlantino organizza i punti geografici su due livelli:
- **Principali... (i "siti"):**
Rappresentano i *contenitori*, cioè le *macro-aree* o *macro-categorie* (e.g. la città di Roma; la categoria "Siti archeologici della Sicilia"). Hanno un colore identificativo.
- **... e secondari (i "punti di interesse"):**
Sono i singoli punti specifici legati a un *sito principale* (es. Galleria degli Uffizi, Teatro Greco di Siracusa). Ereditano il colore del loro sito "padre", di una tonalità più tenue ma riconoscibile. 

Puoi mostrare o nascondere interi siti dal menù laterale, oppure nascondere tutti quelli secondari (con il tasto ***SEGNAPOSTO SECONDARI***) per testare la tua memoria.

## Visuale
Si possono visualizzare tre tipi di mappa, cambiando dall'una all'altra in qualsiasi momento dai tasti in alto a destra senza spostamenti improvvisi:
- immagine OpenStreetMap, con toponomastica, strade, confini di stati e regioni. La lingua che si legge è quella ufficiale dello stato osservato, ma sono rispettati bilinguismi e certi nomi in lingua o dialetto locale. Consiglio, per esperienza personale, di servirsene nella fase di assegnazione dei segnaposto, possibilmente congiuntamente a un'altra mappa digitale o cartacea.
- immagine satellitare;
- cartina muta.

La visualizzazione dinamica e l'interattività delle mappe sono rese possibili dall'integrazione della libreria JavaScript Leaflet.

## Filosofia del progetto e contributi

Non ho voluto creare una mappa e basta, ma una mappa personalizzabile da ciascuno in base alle proprie necessità per il proprio studio, giocando con pochi elementi minimi:
- la gerarchia tra marker principali e secondari;
- le note di testo;
- la condivisibilità dei file delle mappe.

L'Atlantino è pensato appositamente come strumento di studio, ma essendo lo studio qualcosa di altamente personale (e poco prevedibile), immagino che qualcuno troverà modalità d'utilizzo molto diverse da quelle da me immaginate e preventivate. Per questo, il progetto è open source e ogni commento, feedback o contributo (sia come miglioramento che come suggerimento) sarà enormemente gradito e ben accetto.

## IMPORTANTE: Uso dei dati

I dati vengono salvati localmente nel browser. **Se viene cancellata la cache e i dati non sono stati scaricati, essi andranno perduti**. Puoi esportare la tua mappa come JSON e reimportarla in un secondo momento o su un altro browser. L'importazione di mappe o file JSON creati da terzi avviene sotto la diretta responsabilità dell'utente.

## Licenza

Il codice è distribuito con licenza MIT.
