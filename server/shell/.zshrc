autoload -Uz colors
colors

export CLICOLOR=1
export COLORTERM=truecolor
export FORCE_COLOR=1
export LSCOLORS=ExGxBxDxCxEgEdxbxgxcxd
export TERM=xterm-256color

setopt prompt_subst
PROMPT='%(?.%F{green}.%F{red})%n@finn-teminal%f %F{yellow}%1~%f %# '
RPROMPT='%(?..%F{red}exit:%?%f)'

alias ls='ls -G'
alias ll='ls -alG'
alias la='ls -AG'
alias grep='grep --color=auto'
alias egrep='egrep --color=auto'
alias fgrep='fgrep --color=auto'

export GREP_COLOR='01;31'
export GREP_COLORS='ms=01;31:mc=01;31:sl=:cx=:fn=35:ln=32:bn=32:se=36'

command_not_found_handler() {
  print -P "%F{red}zsh: command not found: $1%f" >&2
  return 127
}

function @finn() {
  printf '\033[38;2;255;255;255m'
  cat <<'EOF'
       .-"""-.
     .'  . .  '.
    /     v     \
   |   \_____/   |
   |             |
    \           /
     '.       .'
       '-._.-'
       hello
EOF
  printf '\033[0m'
}

_finn_terminal_highlight_input() {
  region_highlight=()

  local command_name="${BUFFER%%[[:space:]]*}"
  [[ -z "$command_name" ]] && return

  local command_end=${#command_name}
  local command_color='fg=green,bold'

  if [[ "$command_name" == sudo ]]; then
    command_color='fg=yellow,bold'
  elif ! whence -w -- "$command_name" >/dev/null 2>&1; then
    command_color='fg=red,bold'
  fi

  region_highlight+=("0 $command_end $command_color")

  if (( ${#BUFFER} > command_end )); then
    region_highlight+=("$command_end ${#BUFFER} fg=white")
  fi
}

zle-line-pre-redraw() {
  _finn_terminal_highlight_input
}

zle -N zle-line-pre-redraw
