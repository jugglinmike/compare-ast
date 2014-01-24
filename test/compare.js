var compareAst = require('..');

suite('compareAst', function() {
	test('whitespace', function() {
		compareAst('\tvar   a=0;\n \t a    +=4;\n\n', 'var a = 0; a += 4;');
	});

	test.skip('dereferencing', function() {
		compareAst('a.b;', 'a["b"];');
	});

	test('IIFE parenthesis placement', function() {
		compareAst('(function() {}());', '(function() {})();');
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

		test('parse failure', function() {
			noMatch(['var a = !;', 'var a = !;'], 1);
		});

		test('name change', function() {
			noMatch(['(function(a) {});', '(function(b) {});'], 3);
		});

		test('value change', function() {
			noMatch(['var a = 3;', 'var a = 4;'], 3);
		});

		test('double binding', function() {
			noMatch([
				'(function(a, b) { console.log(a); });',
				'(function(__UNBOUND0__, __UNBOUND1__) { console.log(__UNBOUND1__); });',
				{ varPattern: /__UNBOUND\d+__/ }
				],
				2
			);
		});
	});
});
