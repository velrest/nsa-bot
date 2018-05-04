defmodule NsaBotTest do
  use ExUnit.Case
  doctest NsaBot

  test "greets the world" do
    assert NsaBot.hello() == :world
  end
end
