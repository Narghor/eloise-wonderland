// -----------------------------------------------
// WHAT THE VISITORS SAY: three chapters each, and small talk when touched
// -----------------------------------------------

export interface Story {
  /** Unlocked by friendship; the last one comes with the gift. */
  chapters: [string[], string[], string[]];
  /** One line said at random when the visitor is touched. */
  chatter: string[];
}

export const STORIES: Record<string, Story> = {
  noisette: {
    chapters: [
      [
        'Oh ! Bonjour… Je ne fais que passer, promis. Je repars demain. Ou après-demain.',
        'Dans mon sac, j’ai une carte postale de chaque endroit où j’ai dormi. Cent douze, exactement.',
        'Tu veux voir ? Celle-là, c’est un phare. Celle-là, une gare sous la neige. Celle-là… non, pas celle-là.',
        'Elles sont toutes écrites. Mais aucune n’est envoyée.',
      ],
      [
        'Bon. Je vais te dire pour les cartes postales.',
        'Elles sont toutes pour la même personne : mon petit frère, Gland. On a été séparés pendant un déménagement, quand on était petits.',
        'Je lui écris partout où je passe. Mais je n’ai jamais su son adresse.',
        'Alors je voyage. Je me dis qu’un jour, je tomberai sur lui par hasard.',
        'Cent douze villes. Toujours pas de Gland. Mais je ne lâche rien.',
      ],
      [
        'Il s’est passé un truc incroyable. Flocon a vu mes cartes et il a froncé le bec.',
        '« Gland ? Un jeune renard roux, très poli, qui laissait toujours un pourboire en noisettes ? Il est venu à mon hôtel, chaque été, pendant cinq ans. »',
        'Il avait gardé le registre. Avec une adresse dedans. UNE ADRESSE.',
        'J’ai envoyé les cent douze cartes d’un coup. Le facteur m’a regardée bizarrement.',
        'Ce matin, j’ai reçu une réponse. Une seule ligne : « Moi aussi je te cherchais. »',
        'Tiens, c’est la couleur des forêts en octobre. La cent treizième carte, je l’ai écrite d’ici. Et celle-là, je la garde.',
      ],
    ],
    chatter: [
      'Tu crois que ta maison mérite une carte postale ? Moi oui.',
      'Je repars demain. Enfin, c’est ce que je dis depuis trois semaines.',
      'Flocon range mes cartes par ordre alphabétique quand j’ai le dos tourné.',
      'Ça sent la soupe à la citrouille quelque part, non ?',
    ],
  },
  biscotte: {
    chapters: [
      [
        'Mmmh… ça sent le gâteau ici, non ? Non ? Ah. Tant pis.',
        'Je suis pâtissier. Enfin, je l’étais, avant que ma boutique ferme.',
        'Si un jour tu as une belle cuisine, je t’apprendrai ma tarte aux mûres. Juré sur ma toque.',
      ],
      [
        'Ma boutique s’appelait « Le Petit Four ». Les gens faisaient la queue jusqu’au coin de la rue.',
        'Et puis un jour, un poème est paru dans le journal du quartier. Il s’appelait « Le gâteau triste ».',
        '« Trop de crème, trop de dorures, il a oublié la confiture. » Tout le monde a cru que ça parlait de moi.',
        'Les clients sont partis un par un. Le pire ? Le poème avait raison. Je ne faisais plus des gâteaux qui rendent heureux.',
        'Je n’ai jamais su qui l’avait écrit. Signé simplement : « P. »',
      ],
      [
        'Tu ne devineras jamais. « P. », c’était Plume.',
        'Elle est venue me voir en tremblant, son carnet serré contre elle. Elle avait écrit ce poème sur un gâteau qu’elle avait raté, chez elle. Un ami l’avait envoyé au journal sans lui demander.',
        'Elle s’est excusée pendant dix minutes. Je lui ai répondu qu’elle m’avait rendu service.',
        'Je rouvre une toute petite boutique. Elle s’appellera « La Confiture ». Plume écrira les étiquettes.',
        'Voilà ma toque des grands jours. Elle porte bonheur aux cuisiniers. Prends-en soin !',
      ],
    ],
    chatter: [
      'Une pincée de sel dans un gâteau, c’est le secret. Ne le répète pas.',
      'J’ai goûté ta cuisine. Mmh. Pas mal. Vraiment pas mal.',
      'La toque, ce n’est pas pour faire joli. Enfin… un peu quand même.',
      'Tu as des mûres ? Non ? Je disais ça comme ça.',
    ],
  },
  plume: {
    chapters: [
      [
        'Ah ! Pardon, je ne t’avais pas vu arriver… Je lisais.',
        'J’écris des poèmes. Ils sont dans mon carnet, bien cachés. Personne ne les lit.',
        'Enfin… presque personne. Une fois, l’un d’eux s’est échappé. Ça s’est très mal passé.',
      ],
      [
        'Le poème qui s’est échappé s’appelait « Le gâteau triste ». Je l’avais écrit sur un gâteau que j’avais raté. Un vrai désastre, tout penché.',
        'Un ami l’a trouvé drôle et l’a envoyé au journal. Signé « P. ».',
        'Et toute la ville a cru que c’était une critique du « Petit Four », la pâtisserie de Biscotte.',
        'Sa boutique a fermé. À cause de moi. Je ne lui ai jamais rien dit. Je n’ai pas osé.',
        'Chaque fois qu’il vient ici, je me cache derrière un livre. Tu as remarqué ?',
      ],
      [
        'Je l’ai fait. Je suis allée voir Biscotte, et j’ai tout dit.',
        'Il a ri. Il a RI ! Il a dit que mon poème l’avait réveillé.',
        'Alors je lui en ai lu un autre, à voix haute, pour la première fois de ma vie :',
        '« Petite graine dans le noir, tu crois que tu n’as rien à voir. Mais un matin, sans prévenir, le monde entier te voit fleurir. »',
        'J’écrirai les étiquettes de sa nouvelle boutique. Des petits poèmes sur chaque pot de confiture.',
        'Pour te remercier, voilà le décor de ma bibliothèque préférée. On y lit en silence, et c’est très bien comme ça.',
      ],
    ],
    chatter: [
      '« Une maison qui sent le pain chaud, c’est un poème sans les mots. » … Oublie ce que j’ai dit.',
      'Chut. Je compte les syllabes.',
      'Biscotte est là ? Non ? Ouf. Enfin, je veux dire… dommage.',
      'J’ai trouvé une rime avec « citrouille ». Je ne te dirai pas laquelle.',
    ],
  },
  mirabelle: {
    chapters: [
      [
        'Bonjour bonjour ! Oh, tes carottes ont l’air en pleine forme. Tu leur parles ?',
        'Moi, je parle à toutes mes plantes. Elles poussent deux fois plus vite. Bon, c’est pas prouvé.',
        'J’ai essayé avec les cailloux aussi. Ça marche moins bien.',
      ],
      [
        'Chez ma mamie, il y avait un vieux mirabellier. Elle l’avait planté le jour de ma naissance.',
        'Chaque été, on faisait des confitures. J’avais le droit de lécher la cuillère.',
        'Quand la maison a été vendue, les nouveaux propriétaires ont coupé l’arbre. Je n’ai même pas pu garder un noyau.',
        'Depuis, je cherche un jardin où tout recommencer. Le tien a la bonne lumière.',
      ],
      [
        'Il m’est arrivé quelque chose de fou. Brume, le fantôme, flottait près de moi dans le jardin.',
        'Il m’a dit : « Je connais ce parfum. Une maison avec un mirabellier… » Et il a sorti un noyau de son collier de perles.',
        'Il le gardait depuis des années, sans savoir pourquoi. C’était un noyau de l’arbre de ma mamie. Il avait flotté là-bas, une nuit de brouillard.',
        'On l’a planté ensemble dans ton jardin, ce matin. Il faudra des années. Je viendrai lui parler tous les jours.',
        'Tiens, un collier de mirabelles. Pour qu’on se souvienne du jour où tout a recommencé.',
      ],
    ],
    chatter: [
      'Bonjour, les carottes ! … Je parlais aux carottes, pas à toi. Bonjour quand même !',
      'Si tu arroses le matin, les plantes sont de meilleure humeur.',
      'Brume dit que les fantômes n’ont pas le nez fin. Moi, je crois qu’il ment.',
      'Un jour, il y aura des mirabelles ici. Tu verras.',
    ],
  },
  brindille: {
    chapters: [
      [
        'Tu entends ça ? Le bruit de l’eau, le vent dans les feuilles… C’est presque une chanson.',
        'Il lui manque juste une note. Je la cherche depuis des années.',
        'Si tu l’entends, préviens-moi. Elle ressemble à… je ne sais pas. C’est bien le problème.',
      ],
      [
        'J’ai joué dans un grand orchestre. Tout était parfait, réglé, répété cent fois.',
        'Un soir, en plein concert, j’ai entendu une grenouille chanter dehors, sous la fenêtre. Une vraie, toute petite.',
        'C’était plus beau que tout l’orchestre. Alors j’ai posé mon violon… et je suis sortie l’écouter. En plein milieu du morceau.',
        'On m’a renvoyée le lendemain. Je ne regrette rien. Je n’ai jamais retrouvé cette grenouille.',
      ],
      [
        'JE L’AI TROUVÉE ! La note qui manquait ! C’était le rire de ton compagnon quand il saute dans le bassin !',
        'Et tu sais quoi ? La petite grenouille du concert… c’était Opaline. Elle répétait un tour de magie et s’était ratée : elle s’était changée en grenouille pour la soirée.',
        'Elle m’a reconnue tout de suite. Elle chante faux, maintenant qu’elle est redevenue licorne. Mais on fait des spectacles ensemble.',
        'Ma chanson est finie. Elle s’appelle « Chez toi ».',
        'Tiens, mon nénuphar porte-bonheur. Je l’avais sur la tête le jour où j’ai quitté l’orchestre.',
      ],
    ],
    chatter: [
      'Ploc… ploc… Ton robinet fait un très joli la bémol.',
      'Je suis sûre que ta maison a une chanson. Il faut juste l’écouter.',
      'Opaline et moi, on répète demain. Bouche tes oreilles.',
      'Une limonade à la menthe, et je joue jusqu’au matin !',
    ],
  },
  flocon: {
    chapters: [
      [
        'Mes hommages. Flocon, pour vous servir. Votre demeure est fort charmante.',
        'J’ai servi trente ans au Grand Hôtel des Glaces. Je reconnais une maison bien tenue.',
        'Permettez : votre coussin était de travers. Voilà. Pardon, l’habitude.',
      ],
      [
        'L’hôtel a fermé l’hiver dernier. Trente ans à accueillir des voyageurs, et plus personne à accueillir.',
        'J’ai gardé une seule chose : le grand registre. Tous les noms de tous les clients, depuis le premier jour.',
        'Le soir, je le relis. Je me souviens de chacun. La petite renarde blanche de la chambre douze, chaque hiver, qui ne voulait jamais partir.',
        'C’est étrange, de ne plus être utile à personne. Je ne savais pas que ça pouvait faire si froid. Même pour un pingouin.',
      ],
      [
        'Le registre a servi ! Noisette cherchait son frère depuis des années. Il était dans mes pages, avec son adresse.',
        'Et la petite renarde de la chambre douze… c’était Givrette. Elle m’a reconnu tout de suite. Elle m’a serré si fort que mon nœud papillon s’est défait.',
        'Puis-je vous confier une idée ? Votre maison accueille tant de monde… Elle ferait un merveilleux petit hôtel.',
        'Si un jour vous ouvrez des chambres pour vos amis, je serais honoré de m’en occuper. J’apporterai le registre. Il a encore beaucoup de pages blanches.',
        'En attendant, acceptez mon chapeau melon. Un hôte digne de ce nom se doit d’être élégant.',
      ],
    ],
    chatter: [
      'Votre thé sera servi à dix-sept heures précises. Ou quand vous voudrez, bien sûr.',
      'Un pingouin ne court jamais. Il se hâte avec dignité.',
      'J’ai épousseté la bibliothèque. Ne me remerciez pas, j’en avais besoin.',
      'Une tarte au citron ? Ah, vous savez parler à un pingouin.',
    ],
  },
  comete: {
    chapters: [
      [
        'Chut ! Ne le dis à personne… Mais j’ai peur du noir.',
        'Un dragon qui a peur du noir. C’est ridicule, hein ? Je ne crache même pas de feu. Juste des étincelles.',
        'Regarde : pfff. … Bon, il fait jour, ça se voit moins.',
      ],
      [
        'Tous les soirs, quand tout le monde dort, je m’assois à ta fenêtre et je fais des étincelles. Pour ne pas être dans le noir.',
        'Je pensais que personne ne le voyait.',
        'Mais Givrette m’a dit un truc bizarre : l’hiver dernier, elle a vu une petite lumière dans la vallée. La seule maison éclairée à des kilomètres.',
        'Elle a marché toute la nuit dans la neige pour la rejoindre. C’était… ma lumière ?',
      ],
      [
        'C’était bien moi ! Ma peur du noir a guidé Givrette jusqu’ici. Sans elle, elle serait restée seule dans la montagne.',
        'Alors j’ai compris un truc : ma petite lumière, elle ne sert pas qu’à moi.',
        'Cette nuit, j’ai dormi sans veilleuse ! Et à minuit, je me suis réveillé pour allumer la fenêtre. Pas parce que j’avais peur. Pour ceux qui cherchent leur chemin.',
        'Tiens : la couleur de la nuit, avec toutes ses étoiles. Comme ça, toi non plus tu n’auras jamais peur du noir.',
      ],
    ],
    chatter: [
      'Pfff ! … Une étincelle. Un jour, ce sera une flamme.',
      'Ton télescope voit jusqu’à la lune ? Et derrière la lune ?',
      'Givrette dit que je suis un phare. Un phare ! Moi !',
      'Le noir ? Pfff. Même pas peur. … Enfin, moins.',
    ],
  },
  brume: {
    chapters: [
      [
        'Ooooh… Pardon. Je ne voulais pas te faire peur. Je cherche quelque chose.',
        'Je ne sais plus quoi. Je ne sais plus qui je suis, d’ailleurs. Juste que j’aime les perles, et l’odeur du thé.',
        'Ta maison sent bon le thé. C’est pour ça que je reste, je crois.',
      ],
      [
        'Dans ton miroir, j’ai vu un souvenir. Cette maison-ci, il y a très longtemps. Une théière fumante sur la table.',
        'Un vieux panda versait le thé. Il riait. La vapeur montait, montait…',
        'Je crois que j’étais là, ce jour-là. Je crois que je ne suis jamais reparti.',
        'J’ai aussi un noyau de mirabelle dans mon collier. Je ne sais pas d’où il vient. Bizarre, non ?',
      ],
      [
        'Je sais qui je suis ! Bambou m’a montré une vieille photo de son grand-père, ici même, devant la première théière de la maison.',
        'Je n’ai jamais été une personne. Je suis la vapeur de cette toute première tasse de thé. Celle qui a fait de cette maison un « chez-soi ».',
        'Je suis resté parce que j’attendais que la maison se remplisse à nouveau de rires. C’est fait.',
        'Le noyau, je l’ai rendu à Mirabelle. Il venait du jardin de sa mamie. Je flotte beaucoup, la nuit, je ramasse des choses.',
        'Garde ce brouillard du matin. C’est un peu de moi, et c’est tout ce que j’ai de plus précieux.',
      ],
    ],
    chatter: [
      'Ooooh… Pardon. Je fais ça quand je suis content.',
      'Tu n’aurais pas une tasse de thé ? Juste pour la sentir.',
      'Je suis passé à travers ton mur. Désolé. Il est très joli de l’intérieur.',
      'Les perles, ça brille même dans le brouillard.',
    ],
  },
  butine: {
    chapters: [
      [
        'Bzz… Pardon, c’est l’habitude. Je parle souvent à mes abeilles.',
        'Je les ai suivies jusqu’ici : elles adorent ton jardin.',
        'Si tu leur gardes quelques fleurs, elles te le rendront en miel. Promis.',
      ],
      [
        'Il faut que je t’avoue quelque chose d’un peu absurde.',
        'Je suis apicultrice… et je suis allergique au miel. Une cuillère, et j’éternue pendant une heure.',
        'Je n’ai jamais goûté mon propre miel. Je le donne à tout le monde. Je regarde les gens le manger.',
        'Les abeilles le savent, je crois. Elles me font toujours un petit pot en plus, au cas où.',
      ],
      [
        'Mes abeilles ont fait une ruche près de ta maison. Elles ont décidé que c’était chez elles.',
        'Et dans ta serre, elles ont butiné les fleurs de givre de Givrette. Leur miel est devenu tout blanc.',
        'J’en ai goûté une goutte. Une seule. … Aucun éternuement ! Le premier miel de ma vie !',
        'J’ai pleuré un peu. Les abeilles ont fait semblant de ne pas voir.',
        'Tiens : c’est la couleur du miel au soleil du matin. Pour toi.',
      ],
    ],
    chatter: [
      'Bzz bzz. … Elles disent bonjour.',
      'Tes fleurs ont un parfum de premier choix. Les abeilles l’ont noté.',
      'Une tarte au miel ? Je regarderai. De loin. Atchoum.',
      'Si une abeille te suit, c’est qu’elle t’aime bien.',
    ],
  },
  bambou: {
    chapters: [
      [
        'Bonjour. Ta serre est magnifique… On y entend presque les feuilles pousser.',
        'Je cultive du thé, là-haut dans les montagnes. Il faut beaucoup de patience.',
        'Ta maison est calme. J’aime les endroits calmes. Et j’ai l’impression de la connaître.',
      ],
      [
        'Avant, j’étais toujours pressé. Je voulais tout finir, tout de suite.',
        'Un jour, j’ai laissé infuser mon thé trop longtemps parce que je regardais un nuage. C’était le meilleur thé de ma vie.',
        'Mon grand-père disait : « Le thé te dit quand il est prêt. Pas l’inverse. »',
        'Il a habité une maison dans cette vallée, il y a très longtemps. Il ne m’a jamais dit laquelle.',
      ],
      [
        'J’ai retrouvé une photo de mon grand-père. Il est assis à une table, avec une théière. Derrière lui, il y a… ta fenêtre. La même.',
        'C’était cette maison. Il y a servi le tout premier thé, le jour où elle a été construite.',
        'Et Brume m’a dit qu’il était la vapeur de cette tasse-là. J’ai mis du temps à le croire. J’ai bu trois thés pour réfléchir.',
        'Je crois que les maisons se souviennent de ceux qui les ont aimées. Celle-ci t’aime bien.',
        'Voici la couleur du jade, celle de mes feuilles de thé. Garde-la, et prends ton temps.',
      ],
    ],
    chatter: [
      'Rien ne presse. … Vraiment rien.',
      'Un nuage en forme de théière. Regarde. … Il est parti. Tant pis.',
      'Le risotto au thym, il faut le remuer avec amour. Et beaucoup de patience.',
      'Brume flotte au-dessus de ma tasse. Il dit que ça lui rappelle des souvenirs.',
    ],
  },
  opaline: {
    chapters: [
      [
        'Ta-daaa ! … Bon, d’habitude, il y a des paillettes. Elles sont restées dans ma valise.',
        'Je suis magicienne. Enfin, j’apprends. Mes tours ratent un peu, parfois.',
        'Une fois, je me suis changée en grenouille pour toute une soirée. Mais ça, c’est une autre histoire.',
      ],
      [
        'Tu veux savoir un secret ? Je n’ai jamais fait un tour devant un vrai public.',
        'Le soir où je me suis changée en grenouille, je répétais sous la fenêtre d’une salle de concert. J’ai chanté pour me consoler.',
        'Et une violoniste est sortie en plein concert pour m’écouter. Pour MOI. Une grenouille ratée.',
        'Je ne l’ai jamais revue. Je pense souvent à elle.',
      ],
      [
        'Je l’ai retrouvée ! La violoniste, c’était Brindille ! Elle cherchait encore ma chanson de grenouille.',
        'Alors on a fait un spectacle, devant tes visiteurs, dans ton salon. Elle jouait, je faisais apparaître des colombes.',
        'Bon, c’est Mirabelle qui est sortie du chapeau au lieu d’un lapin. Elle s’était cachée dedans pour faire une surprise.',
        'Tout le monde a applaudi quand même. Ma vraie magie, c’était d’oser.',
        'Tiens : c’est la couleur des paillettes que j’avais oubliées.',
      ],
    ],
    chatter: [
      'Choisis une carte. N’importe laquelle. … Ah, elle est tombée. Recommence.',
      'Abracadabra ! … Rien ? Bon, c’était un tour invisible.',
      'Brindille dit que je chante comme une casserole. Une casserole magique.',
      'Ton miroir est le meilleur public du monde. Il ne rit jamais au mauvais moment.',
    ],
  },
  givrette: {
    chapters: [
      [
        'Brrr ! Enfin un endroit chaud. Je peux m’asseoir près de toi ?',
        'Je ne viens qu’en hiver. Le reste de l’année, je dors tout là-haut, sous la neige.',
        'Ton chocolat chaud sent bon jusqu’à la forêt, tu sais.',
      ],
      [
        'Quand j’étais petite, chaque hiver, mes parents m’emmenaient au Grand Hôtel des Glaces. Chambre douze.',
        'Il y avait un majordome pingouin qui me racontait des histoires. Je ne voulais jamais partir.',
        'L’hôtel a fermé. L’hiver dernier, je suis descendue de la montagne et toutes les maisons étaient noires.',
        'Et puis, au loin, une petite lumière qui scintillait à une fenêtre. Ta fenêtre. Je l’ai suivie toute la nuit.',
      ],
      [
        'La lumière, c’était Comète ! Il faisait des étincelles pour ne pas avoir peur du noir. Il m’a guidée sans le savoir.',
        'Et le majordome de la chambre douze, c’est Flocon. Il m’a reconnue tout de suite. Il a pleuré dans son nœud papillon.',
        'Je crois que je n’étais pas perdue, cet hiver-là. Je rentrais à la maison, c’est tout.',
        'Bientôt le printemps. Il faudra que je reparte. Mais maintenant, je sais où revenir.',
        'Tiens : c’est la couleur du givre au lever du jour. Quand tu la verras, pense à l’hiver prochain.',
      ],
    ],
    chatter: [
      'Brrr. Je reste près du radiateur, si ça ne te dérange pas.',
      'Comète a encore allumé la fenêtre cette nuit. Je dors mieux comme ça.',
      'Un chocolat aux mandarines ? Ma boisson préférée de tout l’hiver !',
      'Flocon m’appelle encore « Mademoiselle de la chambre douze ».',
    ],
  },
};
