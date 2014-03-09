var compareAst = require('..');

suite('compareAst', function() {
	test('whitespace', function() {
		compareAst('\tvar   a=0;\n \t a    +=4;\n\n', 'var a = 0; a += 4;');
	});

	suite('dereferencing', function() {
		test('identifier to literal', function() {
			compareAst('a.b;', 'a["b"];');
		});

		test('literal to identifier', function() {
			compareAst('a["b"];', 'a.b;');
		});
	});

	test('IIFE parenthesis placement', function() {
		compareAst('(function() {}());', '(function() {})();');
	});

	test.skip('variable lists', function() {
		compareAst('var a; var b;', 'var a, b;');
	});

	test('variable binding', function() {
		compareAst(
			'(function(a, b) { console.log(a + b); })(1, 3);',
			'(function(__UNBOUND0__, __UNBOUND1__) {' +
				'console.log(__UNBOUND0__ + __UNBOUND1__);' +
			'}) (1,3);',
			{ varPattern: /__UNBOUND\d+__/ }
		);
	});

	test('string binding', function() {
		compareAst(
			'a["something"];"something2";"something";',
			'a["__STR1__"]; "__STR2__"; "__STR1__";',
			{ stringPattern: /__STR\d+__/ }
		);
	});

	test('string binding with object dereferencing', function() {
		compareAst(
			'a.b;',
			'a["_s1_"];',
			{ stringPattern: /_s\d_/ }
		);
	});

	test('variable binding and string binding', function() {
		compareAst(
			'a["b"];',
			'_v1_["_s1_"];',
			{ stringPattern: /_s\d_/, varPattern: /_v\d_/ }
		);
	});

	test('custom comparator', function() {
		var vals = [3, 4];
		var threeOrFour = function(actual, expected) {
			if (actual.type !== 'Literal' || expected.type !== 'Literal') {
				return;
			}

			if (vals.indexOf(actual.value) > -1 &&
				vals.indexOf(expected.value) > -1) {
				return true;
			}
		};
		compareAst(
			'a.b + 3',
			'a["b"] + 4',
			{ comparators: [threeOrFour] }
		);
	});

	suite('expected failures', function() {

		function noMatch(args, expectedCode) {
			try {
				compareAst.apply(null, args);
			} catch(err) {
				if (!(err instanceof compareAst.Error)) {
					throw new Error(
						'Expected a compareAst error, but caught a generic ' +
						'error: "' + err.message + '"'
					);
				}
				if (err.code === expectedCode) {
					return;
				}
				throw new Error(
					'Expected error with code "' + expectedCode +
					'", but received error with code "' + err.code + '".'
				);
			}
			throw new Error('Expected an error, but no error was thrown.');
		}

		test('unmatched statements', function() {
			noMatch(['', 'var x = 0;'], 3);
			noMatch(['var x = 0;', ''], 3);
		});

		test('parse failure', function() {
			noMatch(['var a = !;', 'var a = !;'], 1);
		});

		test('name change', function() {
			noMatch(['(function(a) {});', '(function(b) {});'], 3);
		});

		test('value change', function() {
			noMatch(['var a = 3;', 'var a = 4;'], 3);
		});

		test('dereferencing', function() {
			noMatch(['a.b;', 'a["b "];'], 3);
		});

		test('double variable binding', function() {
			noMatch([
				'(function(a, b) { console.log(a); });',
				'(function(__UNBOUND0__, __UNBOUND1__) { console.log(__UNBOUND1__); });',
				{ varPattern: /__UNBOUND\d+__/ }
				],
				2
			);
		});

		test('double string binding', function() {
			noMatch([
				'var a = "one", b = "two", c = "three";',
				'var a = "_s1_", b = "_s2_", c = "_s1_";',
				{ stringPattern: /_s\d_/ },
				],
				2
			);
		});

		test('double string binding (through object dereference)', function() {
			noMatch([
				'a.a; a.b; a.c;',
				'a["_s1_"]; a["_s2_"]; a["_s1_"];',
				{ stringPattern: /_s\d/ },
				],
				2
			);
		});

		test('extra statements', function() {
			noMatch(['a;', ''], 3);
		});

		test('unmatched member expression', function() {
			noMatch(['a.b;', '3;'], 3);
		});

	});
});
