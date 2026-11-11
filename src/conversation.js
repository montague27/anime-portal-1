export const CONVERSATIONS = {
  miku: {
    hello: { text: 'Hey, Toasty! The engines have such a nice rhythm today. Taking a break?', choices: [
      ['How are you settling in?', 'home'], ['Want to explore the carrier?', 'ship'], ['Maybe later. See you!', null],
    ] },
    home: { text: 'Pretty well! I found a quiet spot near the bunks to practice. I hope nobody minds a little singing between shifts.', choices: [
      ['A concert would be fun.', 'concert'], ['Need anything for your room?', 'room'], ['Back to work for me.', null],
    ] },
    concert: { text: 'Then it is a promise! A tiny sky concert, just for our crew. You can handle the lights, right?', choices: [['Count me in.', null], ['Tell me about the carrier.', 'ship']] },
    room: { text: 'A plant by the window would be lovely. Something green to keep us company above the clouds.', choices: [['I will keep an eye out.', null], ['What about a concert?', 'concert']] },
    ship: { text: 'The drone bay is my favorite! Watching them leave and come home feels like sending little messages into the sky.', choices: [['We should give the drones names.', 'drones'], ['How are you settling in?', 'home'], ['Let us talk later.', null]] },
    drones: { text: 'Yes! The smallest one can be Pip. Please bring Pip home safely, captain Toasty.', choices: [['Pip is in good hands.', null]] },
  },
  makima: {
    hello: { text: 'There you are, Toasty. A moment of your time? I would like to know how our little crew is doing.', choices: [
      ['The carrier is running well.', 'report'], ['How are you finding life aboard?', 'home'], ['I should return to my rounds.', null],
    ] },
    report: { text: 'Good. Keep an eye on the charging banks and supplies. A dependable routine makes a long journey much more comfortable.', choices: [['Which bay should I check?', 'task'], ['What about the crew?', 'crew'], ['Understood.', null]] },
    task: { text: 'Start with logistics, then look in on the drones. There is no need to rush. I prefer a careful report to a quick one.', choices: [['I will make the rounds.', null], ['And how are you doing?', 'home']] },
    home: { text: 'It is peaceful above the clouds. I rather like the view from the forward windows. You should join me sometime.', choices: [['After my next shift.', 'tea'], ['Do you miss the ground?', 'ground'], ['I will see you later.', null]] },
    tea: { text: 'Then I will make tea. Even a busy little machine deserves a break.', choices: [['That sounds nice.', null], ['Anything else to report?', 'report']] },
    ground: { text: 'Sometimes. But a place becomes familiar through the people in it, do you not think?', choices: [['This crew feels like home.', 'crew'], ['I should get back to work.', null]] },
    crew: { text: 'Miku seems to be in good spirits. Take care of her, and remember to take care of yourself as well.', choices: [['I will.', null], ['Perhaps we should have tea.', 'tea']] },
  },
};

export function createConversation(dialog, onClose) {
  let character = null;
  const name = dialog.querySelector('#conversation-name');
  const line = dialog.querySelector('#conversation-line');
  const choices = dialog.querySelector('#conversation-choices');
  function showNode(id) {
    const node = CONVERSATIONS[character.figure][id];
    line.textContent = node.text;
    choices.replaceChildren();
    for (const [label, next] of node.choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => next ? showNode(next) : dialog.close());
      choices.append(button);
    }
    choices.firstElementChild?.focus();
  }
  dialog.querySelector('#conversation-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { const previous = character; character = null; if (previous) onClose(previous); });
  return {
    get character() { return dialog.open ? character : null; },
    open(npc) {
      if (dialog.open || !CONVERSATIONS[npc.figure]) return false;
      character = npc;
      name.textContent = npc.name;
      dialog.showModal();
      showNode('hello');
      return true;
    },
  };
}
