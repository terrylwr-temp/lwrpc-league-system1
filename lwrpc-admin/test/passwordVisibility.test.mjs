import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../app/reset-password/page.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PasswordInput');
const compiled = ts.transpileModule(component.getText(ast), { compilerOptions: { jsx: ts.JsxEmit.React } }).outputText;

function field(id, label) {
  let state = false;
  const createElement = (type, props, ...children) => ({ type, props: props || {}, children });
  const renderComponent = vm.runInNewContext(`${compiled}; PasswordInput`, {
    React: { createElement, Fragment: 'fragment' },
    useState: () => [state, update => { state = update(state); }],
  });
  return (disabled = false) => {
    const tree = renderComponent({ id, label, disabled, value: 'example-password', required: true, onChange() {} });
    return { input: tree.children[0].props, button: tree.children[1].props };
  };
}

test('both fields start masked and can independently reveal and hide without changing values', () => {
  const fields = [field('new-password', 'new password'), field('confirm-new-password', 'confirm new password')];
  for (const [index, render] of fields.entries()) {
    assert.equal(render().input.type, 'password');
    assert.equal(render().button.type, 'button');
    render().button.onClick();
    assert.equal(render().input.type, 'text');
    assert.equal(render().input.value, 'example-password');
    assert.equal(fields[1 - index]().input.type, 'password');
    render().button.onClick();
    assert.equal(render().input.type, 'password');
  }
});

test('toggle labels, pressed state, and controlled field stay accessible', () => {
  for (const [id, label] of [['new-password', 'new password'], ['confirm-new-password', 'confirm new password']]) {
    const render = field(id, label);
    assert.equal(render().button['aria-label'], `Show ${label}`);
    assert.equal(render().button['aria-pressed'], false);
    assert.equal(render().button['aria-controls'], render().input.id);
    render().button.onClick();
    assert.equal(render().button['aria-label'], `Hide ${label}`);
    assert.equal(render().button['aria-pressed'], true);
    assert.equal(render().input.autoComplete, 'new-password');
    assert.equal(render().input.required, true);
  }
});

test('unready or busy fields disable visibility controls and mask any revealed value', () => {
  const render = field('new-password', 'new password');
  render().button.onClick();
  assert.equal(render().input.type, 'text');
  assert.equal(render(true).input.type, 'password');
  assert.equal(render(true).input.disabled, true);
  assert.equal(render(true).button.disabled, true);
  assert.equal(render(true).button['aria-pressed'], false);
});
