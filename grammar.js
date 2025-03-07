/**
 * @file TES Treesitter Parser (tes)
 * @author RootEntry
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />

//

const DECIMAL_DIGIT = /[0-9]/;

const _numeral = (digit) =>
  choice(
    repeat1(digit),
    seq(repeat1(digit), ".", repeat(digit)),
    seq(repeat(digit), ".", repeat1(digit)),
  );

const _exponent_part = (...delimiters) =>
  seq(
    choice(...delimiters),
    optional(choice("+", "-")),
    repeat1(DECIMAL_DIGIT),
  );

const _list = (rule, seperator) => seq(rule, repeat(seq(seperator, rule)));

module.exports = grammar({
  name: "tes",

  extras: ($) => [/\s/, $.line_comment],

  supertypes: ($) => [
    $._expression,
    // $._type,
    $._literal,
  ],

  precedences: ($) => [
    [
      "binary_exp",
      "binary_mul",
      "binary_add",
      "binary_compare",
      "binary_relation",
      "binary_equality",
      "logical_and",
      "logical_or",
    ],
    ["assign", $.primary_expression],
    ["literal"],
    [$.primary_expression],
  ],

  word: ($) => $.identifier,

  rules: {
    // TODO: add the actual grammar rules
    program: ($) => seq(repeat($._root_statement)),
    _root_statement: ($) => choice($.let_binding, $.out_statement),

    let_binding: ($) =>
      seq("let", field("name", $.identifier), $._initializer, ";"),

    out_statement: ($) =>
      seq(
        "out",
        field("format_str", $.string_literal),
        choice(seq(sepBy(",", $._expression), ";"), ";"),
      ),

    // empty_statement: (_) => ";",

    _lhs_expression: ($) => $.identifier,

    // assignment_expression: ($) =>
    //   prec.right(
    //     "assign",
    //     seq(
    //       field("left", choice($.parenthesized_expression, $._lhs_expression)),
    //       "=",
    //       field("right", $._expression),
    //     ),
    //   ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    _expressions: ($) => choice($._expression, $._sequence_expression),

    _sequence_expression: ($) => prec.right(commaSep1($._expression)),

    _initializer: ($) => seq("<>", field("value", $._expression)),

    _expression: ($) =>
      choice(
        $.primary_expression,
        $.binary_expression,
        // $.assignment_expression,
        // $.unary_expression,
        // $.update_expression,
        // $.call_expression,
        // $.postfix_expression,
        // $.prefix_expression,
      ),

    binary_expression: ($) =>
      choice(
        ...[
          ["&&", 0],
          ["||", 1],
          ["!=", 2],
          ["==", 2],
          ["<", 3],
          ["<=", 3],
          [">=", 3],
          [">", 3],
          ["+", 4],
          ["-", 4],
          ["*", 5],
          ["/", 5],
          ["%", 5],
          ["**", 6, "right"],
        ].map(([operator, precedence, associativity]) =>
          (associativity === "right" ? prec.right : prec.left)(
            precedence,
            seq(
              field("left", $._expression),
              field("operator", operator),
              field("right", $._expression),
            ),
          ),
        ),
      ),

    primary_expression: ($) =>
      choice($.identifier, $._literal, $.parenthesized_expression),

    comment: ($) => choice($.line_comment),

    line_comment: (_) =>
      seq(
        "#",
        choice(
          seq(token.immediate(prec(2, /#/)), /.*/),
          token.immediate(prec(1, /.*/)),
        ),
      ),

    identifier: () => /[_a-zA-Z][_a-zA-Z0-9]*/,

    _literal: ($) => choice($.string_literal, $.number_literal),

    number_literal: () => {
      const decimal_digits = /[0-9][0-9_]*/;
      const signed_integer = seq(optional(choice("-", "+")), decimal_digits);
      const decimal_exponent_part = seq(choice("e", "E"), signed_integer);

      const decimal_literal = choice(
        seq(
          decimal_digits,
          ".",
          optional(decimal_digits),
          optional(decimal_exponent_part),
        ),
        seq(".", decimal_digits, optional(decimal_exponent_part)),
        seq(decimal_digits, optional(decimal_exponent_part)),
      );

      return token(decimal_literal);
    },
    string_literal: () => /"[^"]+"/,
  },
});

function sepBy1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)));
}

function sepBy(sep, rule) {
  return optional(sepBy1(sep, rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {Rule} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
