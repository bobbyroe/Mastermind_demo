var jq = jQuery.noConflict(),
	Mastermind = {

		colors: ['one', 'two', 'three', 'four', 'five', 'six'],

		init: function () {
			this.GameView = new this.Game_view({model: new this.Game()});
		}
	},
	log = console.log.bind(console);
	// log = function() { /* do nothing. */ };

// model for TurnView & SolutionView
Mastermind.Turn = Backbone.Model.extend({
	defaults: {
		id: -1,
		code: ['hole', 'hole', 'hole', 'hole'],
		hint_string: '&middot;&middot;&middot;',
		// presentation
		alt_class: '',
		disabled_class: 'disabled', // for the guess button
		locked_class: ' locked',
		button_text: 'reveal code' // for the solution view
	}
});

Mastermind.Turn_collection = Backbone.Collection.extend({
	model: Mastermind.Turn,

	initialize: function () {
		this.on('reset', this.was_reset);
	}

});


/*************************************************************************************************
* Turn View
*************************************************************************************************/
Mastermind.Turn_view = Backbone.View.extend({

	tagName: 'li',
	className: 'turn',
	template: 'script#turnView',
	guess_el: 'input.guess',

	events: {
		'click input.go': 'guessClicked',
		'click div.piece': 'holeClicked'
	},

	initialize: function () {
		_.bindAll(this, 'render', 'placePiece');

		this.model.on('change:code', this.enableGuess, this);
		this.model.on('change:disabled_class', this.render);

		this.model.on('change:hint_string', this.render);
		this.model.on('change:locked_class', this.render);
		this.model.on('change:code', this.render);
	},

	render: function () {
		var turn_template = jq(this.template).html(),
			turn_html = '';

		turn_html = _.template(turn_template, this.model.toJSON());
		this.$el.html(turn_html);

		return this.el;
	},

	placePiece: function (color, place) { // ***
		log('place piece',color,place);
		if (color !== 'zero') {
			var code_array = this.model.get('code').slice(0);

			code_array[place] = 'nub ' + color;
			this.model.set({code:code_array});
			Mastermind.GameView.allPiecesView.resetNub();
		}
	},
	/*
	arrayify: function (guess_string) {
		var guess_array = guess_string.split('');

		// convert strings to numbers
		for (var i = 0; i < guess_array.length; i += 1) {
			guess_array[i] = parseInt(guess_array[i], 10);
		}
		return guess_array;
	}, */
	holeClicked: function (e) {
		var hole_index = jq(e.currentTarget).attr('id'),
			color_class = Mastermind.GameView.allPiecesView.getNub();
		this.placePiece(color_class, hole_index);
	},

	codeIsValid: function () {
		var code_complete = false,
			code_array = this.model.get('code'),
			num_holes = code_array.length;

		for (var i = 0; i < code_array.length; i += 1) {
			if (code_array[i] !== 'hole') { num_holes -= 1; }
		}
		code_complete = (num_holes === 0);
		return code_complete;
	},

	enableGuess: function () { 
		if (this.codeIsValid()) {
			// remove the disabled class from the guess button
			this.model.set('disabled_class', '');
		}
	},

	guessClicked: function (e) {
		var enabled = !jq(e.currentTarget).hasClass('disabled');
		if (enabled) {
			this.goGuess();
		}
	},

	goGuess: function (guess_array) {
		this.freezeRow();
		Mastermind.GameView.checkGuess(this.model.get('code'));
	},

	freezeRow: function () {
		this.model.set('locked_class','frozen');
		this.model.set('disabled_class','hidden');
	}
	
});


/*************************************************************************************************
* Solution View
*************************************************************************************************/
Mastermind.Solution_view = Backbone.View.extend({

	tagName: 'li',
	template: 'script#solutionView',
	code_el: 'span#code',

	events: {
		'click input#reveal': 'revealClicked'
	},
	
	initialize: function () {
		this.newSolution();
		this.model.on('change:locked_class', this.render, this);
	},

	newSolution: function () {
		var num_colors = Mastermind.colors.length,
			cur_color = -1,
			solution = [];

		for (var i = 0; i < 4; i += 1) {
			random_index = Math.floor(Math.random()*num_colors);
			cur_color = 'nub ' + Mastermind.colors[random_index];
			solution.push(cur_color);
		}
		this.model.set({code: solution});
	},

	render: function () {
		var solution_template = jq(this.template).html();
			solution_html = _.template(solution_template, this.model.toJSON());

		this.$el.html(solution_html);
		return this.el;
	},

	setSolved: function (game_won) {
		var end_text = (game_won) ? 'you won! :D' : 'you lost!!!';
		// log('game over!',end_text);
		this.model.set('button_text','New Game');
		this.model.set('locked_class','');
	},

	getCode: function () {
		return this.model.get('code');
	},

	revealClicked: function (e) {
		e.preventDefault();
		if (this.model.get('button_text') ==='reveal code') {
			Mastermind.GameView.quit();
		} else {
			Mastermind.GameView.restart();
		}
	}
});


/*************************************************************************************************
* All Pieces View
*************************************************************************************************/
Mastermind.AllPieces = Backbone.Model.extend({ 
	defaults: {
		nub_class: 'zero'
	}
});

Mastermind.AllPieces_view = Backbone.View.extend({
	el: 'div#allPieces',
	cur_piece_el: 'div#current_piece',
	piece_template: '<div class="piece nub <%= nub_class %>"></div>',
	events: {
		'click div.nub': 'nubClick'
	},

	initialize: function () {
		this.model = new Mastermind.AllPieces();
		this.model.on('change:nub_class', this.render, this);

		this.render(); // reset the piece div
	},

	render: function () {
		var nub_copy = _.template(this.piece_template, this.model.attributes);
		jq(this.cur_piece_el).html(nub_copy);
	},

	nubClick: function (e) {
		var classes_string = jq(e.currentTarget).attr('class'),
			classes_array = classes_string.split(' '),
			nub_class = classes_array[2]; // this is a hack

			this.setNub(nub_class);	
	},

	setNub: function (nub_class) {
		this.model.set('nub_class', nub_class);	
	},

	getNub: function (nub_class) {
		return this.model.get('nub_class');	
	},

	resetNub: function () {
		this.setNub('zero');	
	}
});


/*************************************************************************************************
* Game View
*************************************************************************************************/
Mastermind.Game = Backbone.Model.extend({
	defaults: {
		// id:-1,
		num_turns: 10,
		turns_remaining: 10,
		win: undefined
	}
});

Mastermind.Game_view = Backbone.View.extend({

	el: 'div#game',
	board_el: 'ul#board',
	header_template: '<div id="header"><h1>Mastermind</h1></div>',
	gameOver_el: 'div#gameOver',

	events: { /* see initialize */ },

	initialize: function () {
		_.bindAll(this,'keyPressed');
		this.turns = new Mastermind.Turn_collection();
		this.solution = new Mastermind.Turn({locked_class:'hidden'});
		this.solutionView = new Mastermind.Solution_view({model:this.solution});
		this.allPiecesView = new Mastermind.AllPieces_view();
		this.turn_views = [];

		this.resetBoard(); // START

		this.model.on('change:win',this.gameOver,this);

		jq(document).off('keydown'); // make sure not to attach the listener twice
		jq(document).on('keydown',this.keyPressed); // catch all keypresses
	},

	resetBoard: function () {
		var turns_array = [],
			turn_model = {},
			cur_turn = '',
			class_name = '',
			locked_class = '';

		for (var i = 0; i < this.model.get('num_turns'); i +=1 ) {
			// initialize the model
			class_name = (i % 2) ? 'alt' : '';
			locked_class = (i !== 0) ? 'locked' : '';
			turn_model = new Mastermind.Turn({alt_class:class_name, locked_class:locked_class, id:i});
			
			cur_turn = new Mastermind.Turn_view({model:turn_model});
			turns_array.push(turn_model);
			this.turn_views.push(cur_turn);
		}
		
		jq(this.gameOver_el).attr('class',''); // reset the game over message
		this.turns.reset(turns_array);

		this.render();
	},

	render: function () { // only fired when game is initialized

		var html_els_array = [this.header_template, this.solutionView.render()];

		for(var i = 0; i < this.turns.length; i += 1) {
			html_els_array.push(this.turn_views[i].render());
		}
		jq(this.board_el).html(html_els_array);
	},

	keyPressed: function (e) {
		var k = e.keyCode,
			keys = { /* select the color */
				81:{ k:'one' }, // Q
				87:{ k:'two' }, // W
				69:{ k:'three' }, // E
				82:{ k:'four' }, // R
				84:{ k:'five' }, // T
				89:{ k:'six' }, // Y
				/* select the slot */
				49: { k:0 }, // 1
				50: { k:1 }, // 2
				51: { k:2 }, // 3
				52: { k:3 } // 4
			},
			ENTER = 13,
			ESC = 27,
			cur_turn_view = this.turn_views[this.getCurrentTurn().get('id')],
			key_obj;

		key_obj = keys[k];
		if (typeof key_obj !== 'undefined') {
			if (typeof key_obj.k === 'string') { 
				this.allPiecesView.setNub(key_obj.k); 
			}
			if (typeof key_obj.k === 'number') { 
				log('keyPressed',this.allPiecesView.getNub(), key_obj.k);
				cur_turn_view.placePiece(this.allPiecesView.getNub(), key_obj.k);
			}
		} else {
			if (k === ENTER) {
				cur_turn_view.goGuess();
			}
			if (k === ESC) {
				this.quit();
			}
		}
		return false; 
	},

	checkGuess: function (guess_array) {
		var solution_copy = this.solutionView.getCode().slice(0),
			guess_copy = guess_array.slice(0),
			num_black = 0,
			num_white = 0,
			num_colors = 4;

		// check for exact matches
		for (var i = 0; i < num_colors; i += 1) {
			if (guess_copy[i] === solution_copy[i]) {
				num_black += 1;
				guess_copy[i] ='x';
				solution_copy[i] = 'z';
			}
		}
		// check for color match only
		for (var j = 0; j < num_colors; j += 1) {
			for (var k = 0; k < num_colors; k += 1) {
				if (guess_copy[j] === solution_copy[k]) {
					num_white += 1;
					guess_copy[j] = 'x';
					solution_copy[k] = 'z';
				}
			}
		}
		// log('* checking:', guess_copy, 'against:',solution_copy,', spot on:',num_black,', color only:',num_white);
		this.handleResults(num_black,num_white);
	},

	handleResults: function (num_black,num_white) { // ***

		// display the hints / do next turn
		hint_string = '<p class="hint b">' + num_black + '</p><p class="hint w">' + num_white + '</p>';
		this.getCurrentTurn().set('hint_string', hint_string);
		
		// decrement turns_remaining // (this.getCurrentTurn === next turn)
		this.model.set('turns_remaining', this.model.get('turns_remaining') - 1);

		// WIN?
		if (num_black === 4) {
			this.model.set('win',true);
		} else if (this.model.get('turns_remaining') === 0) {
			this.model.set('win',false);
		} else {
			log(this.model.get('turns_remaining'), 'turns left');
			this.getCurrentTurn().set('locked_class','');
		}
	},

	getPreviousTurn: function () {
		var cur_turn = this.getCurrentTurn(),
			prev_id = cur_turn.get('id') - 1,
			prev_turn = this.turns.get(prev_id);
			
		return prev_turn;
	},

	getCurrentTurn: function () {
		var turn_index = this.model.get('num_turns') - this.model.get('turns_remaining'),
			cur_turn = this.turns.at(turn_index);

		return cur_turn;
	},

	getNextTurn: function () {
		var cur_turn = this.getCurrentTurn(),
			next_id = cur_turn.get('id') + 1,
			next_turn = this.turns.get(next_id);
			
		return next_turn;
	},

	quit: function () {
		this.model.set('win', false);
	},

	gameOver: function () {
		var you_won = this.model.get('win');
		this.solutionView.setSolved(you_won);
		if (you_won) {
			this.getPreviousTurn().set('locked_class', 'correct');
			jq(this.gameOver_el).text('you won!');
			jq(this.gameOver_el).addClass('win');
		} else {
			jq(this.gameOver_el).text('you lost.');
			jq(this.gameOver_el).addClass('lose');
		}
	},

	restart: function () {
		Mastermind.init();
	}
});

jq(function () {
	Mastermind.init();
});
