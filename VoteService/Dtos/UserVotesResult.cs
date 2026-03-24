namespace VoteService.Dtos;

public record UserVotesResult(string TargetId, string TargetType, int VoteValue);