# Atlantino

Una mappa aperta e personalizzabile per aspiranti guide turistiche, 
pensata appositamente per chi studia e si sta preparando per il concorso 
nazionale da guida turistica.

## Cosa permette di fare?

- scegliere tra visuale satellitare, in OpenStreetMap o con cartina muta e poter cambiare agilmente tra l'una e l'altra in qualsiasi momento;
- assegnare dei segnaposto sulla mappa;
- distinguere i segnaposto tra quelli che indicano siti principali (e.g. Alba Fucens) ed elementi secondari (e.g. l'anfiteatro di Alba Fucens, il moderno centro abitato di Albe, il monte Velino);
- scegliere, in qualsiasi moment, se disattivare la visione degli elementi secondari;
- associare note ai segnaposto;
- usare una modalità ripasso che nasconde i nomi al passaggio del cursore;
- esportare e importare la propria mappa in formato JSON;
- selezionare tutti i siti principali, o deselezionarli tutti, o selezionare solo quelli che si vuole.

## Perché?

Ho voluto fare un esperimento di vibe-coding con Sonnet 5 di Anthropic per creare uno strumento che mi
aiutasse a visualizzare agilmente le decine di diversi siti da studiare per il concorso
da guida turistica, permettendomi di giocare con Leaflet e marker e
creando una gerarchia visuale tra siti principali e loro singoli elementi (o, per esempio, 
elementi naturalistici utili per l'inquadramento geografico di ciascun sito).
Non ho voluto creare una mappa e basta, ma una mappa personalizzabile da ciascuno 
in base alle proprie necessità per il proprio studio, giocando con questi pochi elementi (marker 
principali e secondari, gerarchia tra di essi, note, condivisibilità dei file delle mappe). 
È pensato appositamente come strumento di studio, per questo ho voluto aggiungere 
anche un tasto per DISATTIVARE la visualizzazione dei nomi dei siti al passaggio col cursore sopra di essi.

## Come usarlo

Apri `index.html`.

Per creare nuovi segnaposto ti basterà cliccare sul punto desiderato e compilare i suoi dati, scegliendo se si tratta di un sito da creare o se un elemento che afferisce a un sito già creato.

## Uso dei dati

I dati vengono salvati localmente nel browser. Se viene 
cancellata la cache o si passa a un altro browser e i 
dati non sono stati scaricati, andranno perduti.
Puoi esportare la tua mappa come JSON e reimportarla
in un secondo momento o su un altro browser.

L'importazione di mappe o file JSON creati da terzi 
avviene sotto la diretta responsabilità dell'utente.

## Contribuire

Il progetto è open source e i contributi, i feedback e i suggerimenti sono enormemente graditi.

## Licenza

Il codice è distribuito con licenza MIT.
