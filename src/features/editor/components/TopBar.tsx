import React, { useEffect } from 'react'
import LabelButton from '@/components/ui/LabelButton';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '@/store/store';
import { runCode, submitCode, setActiveTab } from '@/features/editor/slices/editorSlice';
import { setCurrentProblemIndex, updateProblemStatus, updateMultipleProblemStatuses } from '@/features/battle/slices/battleSlice';
import { socketService } from '@/lib/socket';
import toast from 'react-hot-toast';

interface TopBarProps {
  matchId: string;
  input: string;
  onProblemChange?: (index: number) => void;
}

type GameStatus = 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR';

interface GameStateUpdate {
  userId: string;
  problemId: string;
  status: GameStatus;
}

const TopBar = ({ matchId, input, onProblemChange }: TopBarProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { code, language, isRunning, isSubmitting } = useSelector((state: RootState) => state.editor);
  const { player1, player2, problems, currentProblemIndex } = useSelector((state: RootState) => state.battle);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
   ("userId", userId);

   ('🔍 Current state:', {
    userId,
    player1,
    player2,
    currentProblemIndex,
    problems
  });

  // Determine current player and opponent
  const currentPlayer = player1?.id === userId ? player1 : player2;
  const opponentPlayer = player1?.id === userId ? player2 : player1;

   ('👥 Players:', {
    currentPlayer,
    opponentPlayer
  });

  useEffect(() => {
    const handleGameStateUpdate = (data: GameStateUpdate | GameStateUpdate[]) => {
       ('🎮 Game state update received in TopBar:', data);
      const myId = store.getState().auth.user?.id;
      if (Array.isArray(data)) {
         ('📊 Updating multiple problem statuses:', data);
        dispatch(updateMultipleProblemStatuses(data));
      } else {
         ('📊 Updating single problem status:', data);
        dispatch(updateProblemStatus({...data, myId: myId as string}));
      }
    };

    socketService.on('game_state_update', handleGameStateUpdate);

    return () => {
      socketService.off('game_state_update', handleGameStateUpdate);
    };
  }, [dispatch]);

  const handleRunCode = () => {
    const currentProblem = problems[currentProblemIndex];
     ('▶️ Running code for problem:', {
      currentProblem,
      code,
      language,
      input
    });

    if (!currentProblem?.testCases?.[0]) {
      console.error('❌ No test cases available');
      return;
    }

    dispatch(runCode({
      code,
      language,
      matchId,
      input: currentProblem.testCases[0].input
    }));
  };

  const handleSubmitCode = () => {
    const currentProblem = problems[currentProblemIndex];
     ('📤 Submitting code:', {
      currentProblem,
      code,
      language,
      matchId
    });

    if (!currentProblem) {
      toast.error('No problem selected');
      return;
    }

    dispatch(setActiveTab('submissions'));

    dispatch(submitCode({
      code,
      language,
      matchId: matchId,
      questionId: currentProblem.id
    })).then((action) => {
       ('📥 Submit code response:', action);
      if (submitCode.fulfilled.match(action)) {
        const status = action.payload.data?.status;
         ('✅ Submission status:', status);
        if (status === 'ACCEPTED') {
          toast.success('All test cases passed!');
        } else if (status) {
          toast.error(`Submission failed: ${status}`);
        }
      }
    });
  };

  const handleProblemClick = (index: number) => {
     ('🔄 Changing problem to index:', index);
    if (onProblemChange) {
      onProblemChange(index);
    } else {
      dispatch(setCurrentProblemIndex(index));
    }
  };

  const getUserProblemStatusColor = (index: number) => {
    const problem = problems[index];
     ("currentPlayer", currentPlayer);
    if (!problem || !currentPlayer?.solvedProblems){
      if(currentProblemIndex === index) {
        return "border-blue-500 bg-blue-500/10 text-blue-500";
      }
      return '';
    }
     ("currentPlayer.solvedProblems", currentPlayer.solvedProblems);
    const status = currentPlayer.solvedProblems[problem.id]?.status;
     ('🎨 User problem status:', {
      problemId: problem.id,
      status,
      userId: currentPlayer.id
    });
    if (status === 'ACCEPTED') {
      return 'border-green-500 bg-green-500/10 text-green-500';
    } else if (status) {
      return 'border-red-500 bg-red-500/10 text-red-500';
    }
    if(currentProblemIndex === index) {
      return "border-blue-500 bg-blue-500/10 text-blue-500";
    }
    return '';
  };

  const getOpponentProblemStatusColor = (index: number) => {
    const problem = problems[index];
     ("opponentPlayer", opponentPlayer);
    if (!problem || !opponentPlayer?.solvedProblems) return '';
     (problem.id, opponentPlayer.solvedProblems);
    const status = opponentPlayer.solvedProblems[problem.id]?.status;
     ("opponentPlayer.solvedProblems", opponentPlayer.solvedProblems);
     ('🎨 Opponent problem status:', {
      problemId: problem.id,
      status,
      userId: opponentPlayer?.id
    });
    if (status === 'ACCEPTED') {
      return 'border-green-500 bg-green-500/10 text-green-500';
    } else if (status) {
      return 'border-red-500 bg-red-500/10 text-red-500';
    }
    if(currentProblemIndex === index) {
      return "border-blue-500 bg-blue-500/10 text-blue-500";
    }
    return '';
  };

  return (
    <div className="flex items-center justify-between rounded-lg px-8 py-3 bg-[#1A1D24]">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
        <div className="text-white text-base font-medium leading-normal">Player 1 (You)</div>
        <div className="flex gap-2">
          {problems.map((_, index) => (
            <button
              key={index}
              onClick={() => handleProblemClick(index)}
              className={`w-10 h-10 py-2 rounded-md border justify-center items-center inline-flex overflow-hidden
                ${getUserProblemStatusColor(index) || 'border-[#232323] text-gray-500 hover:border-gray-400 hover:text-gray-400'}`}
            >
              <p className="text-base font-medium font-['Quicksand'] leading-normal">
                {index + 1}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LabelButton
          variant="outlined"
          customSize={{ width: '56px', height: '20px' }}
          className="text-sm whitespace-nowrap flex items-center gap-2"
          onClick={handleRunCode}
          disabled={isRunning}
        >
          <Image 
            src="/play.svg"
            alt="Run"
            width={20}
            height={20}
          />
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </LabelButton>
        <LabelButton
          variant="filled"
          customSize={{ width: '56px', height: '20px' }}
          className="text-sm whitespace-nowrap flex items-center gap-2"
          onClick={handleSubmitCode}
          disabled={isSubmitting}
        >
          <Image
            src="/telegram-alt.svg"
            alt="Submit"
            width={20}
            height={20}
          />
          <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
        </LabelButton>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {problems.map((_, index) => (
            <div
              key={index}
              className={`w-10 h-10 py-2 rounded-md border justify-center items-center inline-flex overflow-hidden
                ${getOpponentProblemStatusColor(index) || 'border-[#232323] text-gray-500'}`}
            >
              <p className="text-base font-medium font-['Quicksand'] leading-normal">
                {index + 1}
              </p>
            </div>
          ))}
        </div>
        <div className="text-white text-base font-medium font-['Quicksand'] leading-normal">Player 2</div>
        <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
      </div>
    </div>
  );
};

export default TopBar;